import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq, inArray, isNull, max, or, sql } from "drizzle-orm";
import { MongoClient, type Collection, type Filter } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDbConnection, getDb } from "@/db";
import {
  authors,
  chapters,
  genres,
  mediaAssets,
  MAX_MONGO_SOURCE_ID_LENGTH,
  novelAuthors,
  novelGenres,
  novelSearchDocuments,
  novelStatistics,
  novelTags,
  novels,
  siteSettings,
  tags,
} from "@/db/schema";
import { countChapterWords } from "@/lib/domain/chapter";
import { requireMongoEnv, requireR2Env } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { destroyR2Client, getR2Client } from "@/lib/r2/client";
import { detectImageContentType } from "@/lib/r2/signatures";
import { createUniqueSlug, slugify } from "@/lib/validation/slug";
import { generateObjectKey, MAX_UPLOAD_BYTES } from "@/lib/validation/upload";

const IMPORT_CURSOR_KEY = "jobs.mongo_translated_novel_import.cursor";
const IMPORT_LEASE_KEY = "jobs.mongo_translated_novel_import.lease";
const DEFAULT_BOOK_LIMIT = 5;
const MAX_BOOK_LIMIT = 50;
const DEFAULT_CHAPTER_LIMIT = 100;
const MAX_CHAPTER_LIMIT = 1_000;
const DEFAULT_MAX_RUNTIME_SECONDS = 600;
const MAX_RUNTIME_SECONDS = 1_500;
const RUNTIME_STOP_BUFFER_MS = 30_000;
const LEASE_EXPIRY_BUFFER_MS = 60_000;
const COVER_FETCH_TIMEOUT_MS = 30_000;
const MONGO_CONNECT_TIMEOUT_MS = 10_000;
const MONGO_SOCKET_TIMEOUT_MS = 30_000;
const MAX_CHAPTER_UTF8_BYTES = 4 * 1024 * 1024;
const MONGO_DATABASE = "my-novel";
const INCREMENTAL_INTERVAL_MS = 2 * 24 * 60 * 60_000;
const INCREMENTAL_SAFETY_WINDOW_MS = 6 * 60 * 60_000;

const TRANSLATED_NOVEL_QUERY = {
  category: "novel",
  subCategory: { $in: ["fan_club", "copyright"] },
  status: "verified",
  isPublished: true,
  deletedAt: null,
} as const;

type MongoBook = {
  bookId: string;
  bookName: string;
  bookDetail?: string | null;
  bookIntroduction?: string | null;
  bookCover?: string | null;
  authorName?: string | null;
  translatorName?: string | null;
  bookTypes?: string[];
  bookTags?: string[];
  bookViews?: number;
  isFinished?: boolean;
  totalChapters?: number;
  publishedAt?: Date | null;
  lastChapterUpdatedAt?: Date | null;
};

type MongoChapter = {
  chapterId: string;
  bookId: string;
  chapterTitle?: string | null;
  chapterContent?: string | null;
  chapterPrice?: number | null;
  publishStatus?: string | null;
  isDelete?: boolean | null;
  isVerified?: boolean | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
};

type MongoChapterOrder = {
  bookId: string;
  chapters?: { chapterId: string; isPublished?: boolean; addedAt?: Date }[];
};

type MongoTag = {
  slug: string;
  language?: { th?: string; en?: string };
  description?: string | null;
  order?: number | null;
  isActive?: boolean;
};

type ImportMode = "auto" | "backfill" | "incremental";

type ImportOptions = {
  execute: boolean;
  mode: ImportMode;
  bookLimit: number;
  chapterLimit: number;
  maxRuntimeMs: number;
  uploadImages: boolean;
  now: Date;
};

export type IncrementalCursorState = {
  active: boolean;
  lastSweepCompletedAt?: string;
  sweepUntil?: string;
  afterUpdatedAt?: string;
  afterBookId?: string;
  currentBookId?: string;
  currentBookUpdatedAt?: string;
  chapterOffset?: number;
};

type LastRunState = {
  at: string;
  mode: string;
  dryRun: boolean;
  summary: Record<string, unknown>;
};

export type ImportCursorState = {
  afterBookId?: string;
  currentBookId?: string;
  chapterOffset?: number;
  backfillHighWaterBookId?: string | null;
  backfillStartedAt?: string;
  backfillCompletedAt?: string;
  sourceIdentityVersion?: 0 | 1;
  legacyIdentityThroughBookId?: string | null;
  incremental?: IncrementalCursorState;
  lastRun?: LastRunState;
};

type ImportedChapterAccess = {
  isFree: boolean;
  coinPrice: number;
};

export type ImportedNovelIdentityCandidate = {
  id: string;
  mongoBookId: string | null;
  slug: string;
  title: string;
  coverKey: string | null;
};

export type ImportedChapterIdentityCandidate = {
  id: string;
  mongoChapterId: string | null;
  chapterNumber: number;
  sortOrder: number;
  slug: string;
  title: string;
  content: string;
  publishedAt: Date | null;
};

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

type ImportLeaseState = {
  owner: string;
  acquiredAt: string;
  expiresAt: string;
};

type ImportLeaseHandle = ImportLeaseState & {
  ttlMs: number;
};

export type TranslatedNovelImportLeaseStatus = {
  running: boolean;
  leaseExpiresAt: string | null;
  retryAfterSeconds: number | null;
};

export class TranslatedNovelImportLeaseError extends Error {
  readonly status = 409;

  constructor(
    readonly code: "SYNC_ALREADY_RUNNING" | "SYNC_LEASE_LOST",
    message: string,
    readonly retryAfterSeconds: number,
    readonly leaseExpiresAt: string | null,
  ) {
    super(message);
    this.name = "TranslatedNovelImportLeaseError";
  }
}

export class TranslatedNovelImportStateError extends ApiError {
  constructor() {
    super(
      409,
      "SYNC_BACKFILL_REQUIRED",
      "Complete the initial translated-novel backfill before starting an incremental sync",
    );
    this.name = "TranslatedNovelImportStateError";
  }
}

type ChapterImportResult = {
  imported: number;
  paid: number;
  skipped: number;
  sourceChapters: number;
  processedSourceChapters: number;
  nextOffset: number;
  complete: boolean;
};

function loadLocalDotEnv() {
  const path = resolve(".env");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/u)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^(['"])(.*)\1$/u, "$2");
  }
}

export function mapImportedChapterAccess(chapterPrice: unknown): ImportedChapterAccess {
  const price = typeof chapterPrice === "number" && Number.isFinite(chapterPrice) ? chapterPrice : 0;
  return price > 0 ? { isFree: false, coinPrice: 1 } : { isFree: true, coinPrice: 0 };
}

function integerArgument(name: string, fallback: number, maximum: number) {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

function stringArgument(name: string) {
  const raw = process.argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3);
  return raw?.trim();
}

function parseMode(value: string | undefined): ImportMode {
  if (!value) return "auto";
  if (value === "auto" || value === "backfill" || value === "incremental") return value;
  throw new RangeError("mode must be auto, backfill, or incremental");
}

function parseOptions(): ImportOptions {
  return {
    execute: process.argv.includes("--execute"),
    mode: parseMode(stringArgument("mode")),
    bookLimit: integerArgument("limit", DEFAULT_BOOK_LIMIT, MAX_BOOK_LIMIT),
    chapterLimit: integerArgument("chapter-limit", DEFAULT_CHAPTER_LIMIT, MAX_CHAPTER_LIMIT),
    maxRuntimeMs: integerArgument("max-runtime-seconds", DEFAULT_MAX_RUNTIME_SECONDS, MAX_RUNTIME_SECONDS) * 1_000,
    uploadImages: !process.argv.includes("--skip-images"),
    now: new Date(),
  };
}

export function normalizeTranslatedNovelImportCursor(value: unknown): ImportCursorState {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const state: ImportCursorState = {};
  if (typeof source.afterBookId === "string") state.afterBookId = source.afterBookId;
  if (typeof source.currentBookId === "string") state.currentBookId = source.currentBookId;
  if (Number.isSafeInteger(source.chapterOffset) && Number(source.chapterOffset) >= 0) {
    state.chapterOffset = Number(source.chapterOffset);
  }
  if (typeof source.backfillHighWaterBookId === "string" || source.backfillHighWaterBookId === null) {
    state.backfillHighWaterBookId = source.backfillHighWaterBookId;
  }
  if (typeof source.backfillStartedAt === "string") state.backfillStartedAt = source.backfillStartedAt;
  if (typeof source.backfillCompletedAt === "string") state.backfillCompletedAt = source.backfillCompletedAt;
  if (source.sourceIdentityVersion === 0 || source.sourceIdentityVersion === 1) {
    state.sourceIdentityVersion = source.sourceIdentityVersion;
  }
  if (typeof source.legacyIdentityThroughBookId === "string" || source.legacyIdentityThroughBookId === null) {
    state.legacyIdentityThroughBookId = source.legacyIdentityThroughBookId;
  }
  if (source.incremental && typeof source.incremental === "object") {
    const incremental = source.incremental as Record<string, unknown>;
    state.incremental = {
      active: incremental.active === true,
      ...(typeof incremental.lastSweepCompletedAt === "string"
        ? { lastSweepCompletedAt: incremental.lastSweepCompletedAt }
        : {}),
      ...(typeof incremental.sweepUntil === "string" ? { sweepUntil: incremental.sweepUntil } : {}),
      ...(typeof incremental.afterUpdatedAt === "string" ? { afterUpdatedAt: incremental.afterUpdatedAt } : {}),
      ...(typeof incremental.afterBookId === "string" ? { afterBookId: incremental.afterBookId } : {}),
      ...(typeof incremental.currentBookId === "string" ? { currentBookId: incremental.currentBookId } : {}),
      ...(typeof incremental.currentBookUpdatedAt === "string"
        ? { currentBookUpdatedAt: incremental.currentBookUpdatedAt }
        : {}),
      ...(Number.isSafeInteger(incremental.chapterOffset) && Number(incremental.chapterOffset) >= 0
        ? { chapterOffset: Number(incremental.chapterOffset) }
        : {}),
    };
  }
  if (source.lastRun && typeof source.lastRun === "object") {
    const lastRun = source.lastRun as Record<string, unknown>;
    if (typeof lastRun.at === "string" && typeof lastRun.mode === "string" && typeof lastRun.summary === "object") {
      state.lastRun = {
        at: lastRun.at,
        mode: lastRun.mode,
        dryRun: lastRun.dryRun === true,
        summary: (lastRun.summary ?? {}) as Record<string, unknown>,
      };
    }
  }
  return state;
}

function normalizedStateValue(state: ImportCursorState) {
  return {
    ...(state.afterBookId ? { afterBookId: state.afterBookId } : {}),
    ...(state.currentBookId ? { currentBookId: state.currentBookId } : {}),
    ...(state.chapterOffset ? { chapterOffset: state.chapterOffset } : {}),
    ...(state.backfillHighWaterBookId !== undefined
      ? { backfillHighWaterBookId: state.backfillHighWaterBookId }
      : {}),
    ...(state.backfillStartedAt ? { backfillStartedAt: state.backfillStartedAt } : {}),
    ...(state.backfillCompletedAt ? { backfillCompletedAt: state.backfillCompletedAt } : {}),
    ...(state.sourceIdentityVersion !== undefined ? { sourceIdentityVersion: state.sourceIdentityVersion } : {}),
    ...(state.legacyIdentityThroughBookId !== undefined
      ? { legacyIdentityThroughBookId: state.legacyIdentityThroughBookId }
      : {}),
    ...(state.incremental ? { incremental: state.incremental } : {}),
    ...(state.lastRun ? { lastRun: state.lastRun } : {}),
  };
}

async function loadCursorState() {
  const [setting] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, IMPORT_CURSOR_KEY))
    .limit(1);
  return normalizeTranslatedNovelImportCursor(setting?.value);
}

function normalizeLeaseState(value: unknown): ImportLeaseState | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (
    typeof source.owner !== "string" ||
    !source.owner ||
    typeof source.acquiredAt !== "string" ||
    !Number.isFinite(Date.parse(source.acquiredAt)) ||
    typeof source.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(source.expiresAt))
  ) {
    return null;
  }
  return { owner: source.owner, acquiredAt: source.acquiredAt, expiresAt: source.expiresAt };
}

export function inspectTranslatedNovelImportLease(
  value: unknown,
  now = new Date(),
): TranslatedNovelImportLeaseStatus {
  const lease = normalizeLeaseState(value);
  const expiresAtMs = lease ? Date.parse(lease.expiresAt) : Number.NaN;
  const running = Boolean(lease && expiresAtMs > now.getTime());
  return {
    running,
    leaseExpiresAt: lease?.expiresAt ?? null,
    retryAfterSeconds: running ? Math.max(1, Math.ceil((expiresAtMs - now.getTime()) / 1_000)) : null,
  };
}

export function assertTranslatedNovelImportLeaseAvailable(value: unknown, now = new Date()) {
  const status = inspectTranslatedNovelImportLease(value, now);
  if (!status.running) return;
  throw new TranslatedNovelImportLeaseError(
    "SYNC_ALREADY_RUNNING",
    "Translated novel sync is already running",
    status.retryAfterSeconds ?? 1,
    status.leaseExpiresAt,
  );
}

export function assertTranslatedNovelImportLeaseOwner(value: unknown, owner: string, now = new Date()) {
  const lease = normalizeLeaseState(value);
  if (lease?.owner === owner && Date.parse(lease.expiresAt) > now.getTime()) return lease;
  const status = inspectTranslatedNovelImportLease(value, now);
  throw new TranslatedNovelImportLeaseError(
    "SYNC_LEASE_LOST",
    "Translated novel sync lease was lost before its checkpoint",
    status.retryAfterSeconds ?? 1,
    status.leaseExpiresAt,
  );
}

async function acquireImportLease(ttlMs: number): Promise<ImportLeaseHandle> {
  const owner = randomUUID();
  const insertedAt = new Date();
  let acquiredAt = "";
  let expiresAt = "";
  await getDb().transaction(async (tx) => {
    await tx
      .insert(siteSettings)
      .values({
        key: IMPORT_LEASE_KEY,
        value: {},
        description: "Exclusive lease for Mongo translated novel import",
        isPublic: false,
        updatedAt: insertedAt,
      })
      .onConflictDoNothing();
    const [setting] = await tx
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY))
      .for("update")
      .limit(1);
    const acquiredNow = new Date();
    assertTranslatedNovelImportLeaseAvailable(setting?.value, acquiredNow);
    acquiredAt = acquiredNow.toISOString();
    expiresAt = new Date(acquiredNow.getTime() + ttlMs).toISOString();
    await tx
      .update(siteSettings)
      .set({ value: { owner, acquiredAt, expiresAt }, updatedAt: acquiredNow })
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY));
  });
  return { owner, acquiredAt, expiresAt, ttlMs };
}

async function saveCursorState(state: ImportCursorState, cursorNow: Date, lease: ImportLeaseHandle) {
  let renewedExpiresAt = lease.expiresAt;
  await getDb().transaction(async (tx) => {
    const [setting] = await tx
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY))
      .for("update")
      .limit(1);
    const checkpointNow = new Date();
    const current = assertTranslatedNovelImportLeaseOwner(setting?.value, lease.owner, checkpointNow);
    renewedExpiresAt = new Date(checkpointNow.getTime() + lease.ttlMs).toISOString();
    await tx
      .update(siteSettings)
      .set({ value: { ...current, expiresAt: renewedExpiresAt }, updatedAt: checkpointNow })
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY));
    await tx
      .insert(siteSettings)
      .values({
        key: IMPORT_CURSOR_KEY,
        value: normalizedStateValue(state),
        description: "Cursor for bounded Mongo translated novel import and incremental sync",
        isPublic: false,
        updatedAt: cursorNow,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: normalizedStateValue(state), updatedAt: cursorNow },
      });
  });
  lease.expiresAt = renewedExpiresAt;
}

async function releaseImportLease(lease: ImportLeaseHandle, now = new Date()) {
  await getDb().transaction(async (tx) => {
    const [setting] = await tx
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY))
      .for("update")
      .limit(1);
    if (normalizeLeaseState(setting?.value)?.owner !== lease.owner) return;
    await tx
      .update(siteSettings)
      .set({ value: { releasedAt: now.toISOString() }, updatedAt: now })
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY));
  });
}

async function assertImportLeaseForContentMutation(tx: Tx, lease: ImportLeaseHandle) {
  const [setting] = await tx
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, IMPORT_LEASE_KEY))
    .for("update")
    .limit(1);
  assertTranslatedNovelImportLeaseOwner(setting?.value, lease.owner, new Date());
}

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/gu, " ").replace(/[ \t]+/gu, " ").trim();
}

function htmlToText(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<\s*br\s*\/?>/giu, "\n")
      .replace(/<\/\s*(?:p|div|section|article|h[1-6]|li|tr)\s*>/giu, "\n\n")
      .replace(/<[^>]+>/gu, "")
      .replace(/&nbsp;/giu, " ")
      .replace(/&amp;/giu, "&")
      .replace(/&lt;/giu, "<")
      .replace(/&gt;/giu, ">")
      .replace(/&quot;/giu, "\"")
      .replace(/&#39;/gu, "'")
      .replace(/\n{3,}/gu, "\n\n"),
  );
}

function cleanText(value: unknown, maximum: number) {
  if (typeof value !== "string") return null;
  const text = htmlToText(value).slice(0, maximum).trim();
  return text || null;
}

function nonBlank(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function validateMongoImportSourceId(value: unknown, field: "bookId" | "chapterId") {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > MAX_MONGO_SOURCE_ID_LENGTH
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new ApiError(
      409,
      "SYNC_INVALID_SOURCE_ID",
      `Mongo ${field} must be nonblank, unpadded, contain no control characters, and be at most ${MAX_MONGO_SOURCE_ID_LENGTH} characters`,
    );
  }
  return value;
}

export function validateMongoImportSourceIds(values: readonly unknown[], field: "bookId" | "chapterId") {
  const seen = new Set<string>();
  return values.map((value) => {
    const sourceId = validateMongoImportSourceId(value, field);
    if (seen.has(sourceId)) {
      throw new ApiError(409, "SYNC_DUPLICATE_SOURCE_ID", `Mongo ${field} ${sourceId} appears more than once`);
    }
    seen.add(sourceId);
    return sourceId;
  });
}

export function validateMongoCoverUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Mongo cover URL is invalid");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Mongo cover URL must use HTTP or HTTPS");
  }
  return url;
}

export function validateMongoCoverContentLength(value: string | null, maximumBytes: number) {
  if (value === null) return null;
  if (!/^\d+$/u.test(value)) throw new Error("Mongo cover Content-Length is invalid");
  const length = Number(value);
  if (!Number.isSafeInteger(length) || length > maximumBytes) {
    throw new Error(`Mongo cover exceeds the ${maximumBytes}-byte limit`);
  }
  return length;
}

export async function readBoundedMongoCoverBody(
  body: ReadableStream<Uint8Array> | null,
  maximumBytes: number,
  abort: () => void = () => undefined,
) {
  if (!body) throw new Error("Mongo cover response has no body");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        abort();
        await reader.cancel("Mongo cover exceeded its byte limit").catch(() => undefined);
        throw new Error(`Mongo cover exceeds the ${maximumBytes}-byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function uniqueCleanStrings(values: unknown, maximum = 80) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = nonBlank(value);
    if (!text) continue;
    const normalized = normalizeWhitespace(text).slice(0, maximum);
    const key = normalized.toLocaleLowerCase("th-TH");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function sourceBookSlug(book: MongoBook) {
  return slugify(`${book.bookName}-${book.bookId}`, "novel");
}

export function planMongoImportedNovelIdentity(input: {
  mongoBookId: string;
  title: string;
  legacySlug: string;
  expectLegacy?: boolean;
  mapped?: ImportedNovelIdentityCandidate;
  legacy?: ImportedNovelIdentityCandidate;
}) {
  validateMongoImportSourceId(input.mongoBookId, "bookId");
  if (input.mapped) {
    if (input.mapped.mongoBookId !== input.mongoBookId) {
      throw new ApiError(409, "SYNC_IDENTITY_CONFLICT", "Resolved novel has a different Mongo bookId");
    }
    return { kind: "existing" as const, row: input.mapped };
  }
  if (input.legacy) {
    if (input.legacy.mongoBookId !== null) {
      throw new ApiError(
        409,
        "SYNC_IDENTITY_CONFLICT",
        `Novel slug ${input.legacy.slug} is already owned by another Mongo bookId`,
      );
    }
    if (input.legacy.slug === input.legacySlug && input.legacy.title === input.title) {
      return { kind: "claim" as const, row: input.legacy };
    }
    throw new ApiError(
      409,
      "SYNC_IDENTITY_CONFLICT",
      `Legacy novel ${input.legacy.slug} does not exactly match Mongo book ${input.mongoBookId}; reconcile it before retrying sync`,
    );
  }
  if (input.expectLegacy) {
    throw new ApiError(
      409,
      "SYNC_IDENTITY_CONFLICT",
      `Mongo book ${input.mongoBookId} is inside the previously imported cursor but has no exact legacy identity match; reconcile it before retrying sync`,
    );
  }
  return { kind: "create" as const };
}

export function planMongoImportedChapterIdentity(input: {
  mongoChapterId: string;
  sourceIndex: number;
  title: string;
  content: string;
  mapped?: ImportedChapterIdentityCandidate;
  legacy?: ImportedChapterIdentityCandidate;
}) {
  validateMongoImportSourceId(input.mongoChapterId, "chapterId");
  if (input.mapped) {
    if (input.mapped.mongoChapterId !== input.mongoChapterId) {
      throw new ApiError(409, "SYNC_IDENTITY_CONFLICT", "Resolved chapter has a different Mongo chapterId");
    }
    return { kind: "existing" as const, row: input.mapped };
  }
  if (input.legacy) {
    if (input.legacy.mongoChapterId !== null) {
      throw new ApiError(
        409,
        "SYNC_IDENTITY_CONFLICT",
        `Legacy chapter candidate is already owned by Mongo chapterId ${input.legacy.mongoChapterId}`,
      );
    }
    const position = input.sourceIndex + 1;
    if (
      input.legacy.chapterNumber === position
      && input.legacy.sortOrder === position
      && input.legacy.slug === `chapter-${position}`
      && input.legacy.title === input.title
      && input.legacy.content === input.content
    ) {
      return { kind: "claim" as const, row: input.legacy };
    }
    throw new ApiError(
      409,
      "SYNC_IDENTITY_CONFLICT",
      `Legacy chapter at position ${position} does not exactly match Mongo chapter ${input.mongoChapterId}; reconcile it before retrying sync`,
    );
  }
  return { kind: "append" as const };
}

export function assertTranslatedNovelIncrementalReady(
  mode: ImportMode,
  backfillCompletedAt: string | undefined,
) {
  if (mode === "incremental" && !backfillCompletedAt) throw new TranslatedNovelImportStateError();
}

export function initializeMongoSourceIdentityCursor(state: ImportCursorState) {
  if (state.sourceIdentityVersion === 1) return { changed: false, migrationActive: false } as const;
  if (state.sourceIdentityVersion === 0) {
    if (state.legacyIdentityThroughBookId === undefined) {
      throw new ApiError(
        409,
        "SYNC_IDENTITY_STATE_INVALID",
        "The source-identity migration cursor has no legacy boundary; repair the sync cursor before retrying",
      );
    }
    return { changed: false, migrationActive: true } as const;
  }

  const hasOldProgress = Boolean(
    state.afterBookId
    || state.currentBookId
    || state.backfillHighWaterBookId !== undefined
    || state.backfillStartedAt
    || state.backfillCompletedAt
    || state.incremental
    || state.lastRun,
  );
  if (!hasOldProgress) {
    state.sourceIdentityVersion = 1;
    delete state.legacyIdentityThroughBookId;
    return { changed: true, migrationActive: false } as const;
  }

  const legacyIds = [
    state.afterBookId,
    state.currentBookId,
    state.incremental?.afterBookId,
    state.incremental?.currentBookId,
  ].filter((value): value is string => Boolean(value));
  state.sourceIdentityVersion = 0;
  state.legacyIdentityThroughBookId = legacyIds.length > 0
    ? legacyIds.toSorted().at(-1) ?? null
    : null;
  delete state.afterBookId;
  delete state.currentBookId;
  delete state.chapterOffset;
  delete state.backfillHighWaterBookId;
  delete state.backfillStartedAt;
  delete state.backfillCompletedAt;
  delete state.incremental;
  return { changed: true, migrationActive: true } as const;
}

export function shouldRequireLegacyMongoNovelIdentity(state: ImportCursorState, mongoBookId: string) {
  return state.sourceIdentityVersion === 0
    && typeof state.legacyIdentityThroughBookId === "string"
    && mongoBookId <= state.legacyIdentityThroughBookId;
}

function sourceGenreSlug(value: string) {
  return slugify(value.replace(/_/gu, "-"), "genre");
}

function sourceTagSlug(value: string) {
  return slugify(value, "tag");
}

function sourceAuthorSlug(value: string) {
  return slugify(value, "author");
}

function publicationDate(book: MongoBook, now: Date) {
  const publishedAt = book.publishedAt && book.publishedAt.getTime() > 0 ? book.publishedAt : null;
  return publishedAt ?? book.lastChapterUpdatedAt ?? now;
}

function hasRuntimeBudget(startedAt: number, options: ImportOptions) {
  return Date.now() - startedAt < options.maxRuntimeMs - RUNTIME_STOP_BUFFER_MS;
}

function dateOrNow(value: Date | null | undefined, now: Date) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : now;
}

async function loadMongoGenreMap(collection: Collection<MongoTag>) {
  const rows = await collection.find({}).toArray();
  return new Map(rows.map((row) => [row.slug, row]));
}

export function clearMissingTranslatedNovelBackfillCursor(state: ImportCursorState) {
  delete state.currentBookId;
  delete state.chapterOffset;
  return state;
}

export function getTranslatedNovelBackfillBookIdWindow(state: ImportCursorState) {
  const highWaterBookId = state.backfillHighWaterBookId;
  if (highWaterBookId === null) return null;
  if (highWaterBookId !== undefined && state.afterBookId && state.afterBookId >= highWaterBookId) return null;
  return {
    ...(state.afterBookId ? { $gt: state.afterBookId } : {}),
    ...(highWaterBookId !== undefined ? { $lte: highWaterBookId } : {}),
  };
}

async function loadNextBackfillBook(collection: Collection<MongoBook>, state: ImportCursorState) {
  if (state.currentBookId && state.backfillHighWaterBookId !== null) {
    const current = await collection.findOne({
      ...TRANSLATED_NOVEL_QUERY,
      bookId: state.backfillHighWaterBookId
        ? { $eq: state.currentBookId, $lte: state.backfillHighWaterBookId }
        : state.currentBookId,
    });
    if (current) return { book: current, missingCurrentBook: false };
  }
  const bookId = getTranslatedNovelBackfillBookIdWindow(state);
  if (bookId === null) return { book: null, missingCurrentBook: Boolean(state.currentBookId) };
  const query: Filter<MongoBook> = Object.keys(bookId).length > 0
    ? { ...TRANSLATED_NOVEL_QUERY, bookId }
    : TRANSLATED_NOVEL_QUERY;
  const book = await collection.find(query).sort({ bookId: 1 }).limit(1).next();
  return { book, missingCurrentBook: Boolean(state.currentBookId) };
}

async function captureBackfillHighWaterBookId(collection: Collection<MongoBook>) {
  const book = await collection.find(TRANSLATED_NOVEL_QUERY).sort({ bookId: -1 }).limit(1).next();
  return book?.bookId ?? null;
}

async function loadIncrementalBook(
  collection: Collection<MongoBook>,
  incremental: IncrementalCursorState,
  now: Date,
) {
  if (incremental.currentBookId) {
    const book = await collection.findOne({ ...TRANSLATED_NOVEL_QUERY, bookId: incremental.currentBookId });
    return { book, missingCurrentBook: !book };
  }
  const sweepUntil = new Date(incremental.sweepUntil ?? now.toISOString());
  const afterUpdatedAt = new Date(incremental.afterUpdatedAt ?? new Date(0).toISOString());
  const query: Filter<MongoBook> = {
    ...TRANSLATED_NOVEL_QUERY,
    lastChapterUpdatedAt: { $lte: sweepUntil },
    $or: [
      { lastChapterUpdatedAt: { $gt: afterUpdatedAt } },
      { lastChapterUpdatedAt: afterUpdatedAt, bookId: { $gt: incremental.afterBookId ?? "" } },
    ],
  };
  const book = await collection.find(query).sort({ lastChapterUpdatedAt: 1, bookId: 1 }).limit(1).next();
  return { book, missingCurrentBook: false };
}

export function clearMissingTranslatedNovelIncrementalCursor(incremental: IncrementalCursorState) {
  delete incremental.currentBookId;
  delete incremental.currentBookUpdatedAt;
  delete incremental.chapterOffset;
  return incremental;
}

export function resolveTranslatedNovelIncrementalOrderingTimestamp(input: {
  incremental: IncrementalCursorState;
  bookId: string;
  sourceUpdatedAt: Date | null | undefined;
  now: Date;
}) {
  if (input.incremental.currentBookId === input.bookId && input.incremental.currentBookUpdatedAt) {
    const frozen = new Date(input.incremental.currentBookUpdatedAt);
    if (Number.isFinite(frozen.getTime())) return frozen.toISOString();
  }
  return dateOrNow(input.sourceUpdatedAt, input.now).toISOString();
}

export function completeTranslatedNovelIncrementalBook(
  incremental: IncrementalCursorState,
  bookId: string,
  frozenUpdatedAt: string,
) {
  incremental.afterUpdatedAt = frozenUpdatedAt;
  incremental.afterBookId = bookId;
  clearMissingTranslatedNovelIncrementalCursor(incremental);
  return incremental;
}

async function putCoverToR2(input: {
  sourceUrl: string;
  bookId: string;
  title: string;
  now: Date;
}) {
  const sourceUrl = validateMongoCoverUrl(input.sourceUrl);
  const controller = new AbortController();
  const response = await fetch(sourceUrl, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.1" },
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(COVER_FETCH_TIMEOUT_MS)]),
  });
  if (!response.ok) {
    controller.abort(`Cover fetch failed with HTTP ${response.status}`);
    await response.body?.cancel().catch(() => undefined);
    throw new Error(`Cover fetch failed with HTTP ${response.status}`);
  }
  try {
    validateMongoCoverContentLength(response.headers.get("Content-Length"), MAX_UPLOAD_BYTES.cover);
  } catch (error) {
    controller.abort("Mongo cover Content-Length was rejected");
    await response.body?.cancel().catch(() => undefined);
    throw error;
  }
  const bytes = await readBoundedMongoCoverBody(
    response.body,
    MAX_UPLOAD_BYTES.cover,
    () => controller.abort("Mongo cover exceeded its byte limit"),
  );
  const detected = detectImageContentType(bytes);
  if (!detected) throw new Error("Cover bytes are not a supported image");
  if (bytes.byteLength > MAX_UPLOAD_BYTES.cover) throw new Error("Cover is larger than the allowed upload size");
  const objectKey = generateObjectKey({ assetType: "cover", contentType: detected });
  const env = requireR2Env();
  const put = await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: objectKey,
      Body: bytes,
      ContentType: detected,
      ContentLength: bytes.byteLength,
      Metadata: { assetType: "cover", source: "mongo-import", sourceBookId: input.bookId },
    }),
  );
  await getDb()
    .insert(mediaAssets)
    .values({
      objectKey,
      kind: "COVER",
      status: "READY",
      contentType: detected,
      byteSize: bytes.byteLength,
      altText: input.title,
      etag: put.ETag?.replaceAll("\"", "") ?? null,
      metadata: { source: "mongo-import", sourceBookId: input.bookId },
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing();
  return objectKey;
}

async function ensureCover(book: MongoBook, existingCoverKey: string | null, options: ImportOptions) {
  if (existingCoverKey || !options.uploadImages) return existingCoverKey;
  const sourceUrl = nonBlank(book.bookCover);
  if (!sourceUrl) return null;
  return putCoverToR2({
    sourceUrl,
    bookId: book.bookId,
    title: book.bookName,
    now: options.now,
  });
}

async function ensureGenres(tx: Tx, bookTypes: readonly string[], mongoGenreMap: Map<string, MongoTag>, now: Date) {
  if (bookTypes.length === 0) return [];
  const rows = bookTypes.map((type, index) => {
    const source = mongoGenreMap.get(type);
    return {
      slug: sourceGenreSlug(type),
      name: source?.language?.en || type,
      thaiName: source?.language?.th || null,
      description: cleanText(source?.description, 2_000),
      sortOrder: source?.order ?? index + 1,
      isActive: source?.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
  });
  return tx
    .insert(genres)
    .values(rows)
    .onConflictDoUpdate({
      target: genres.slug,
      set: {
        name: sql`excluded.name`,
        thaiName: sql`excluded.thai_name`,
        description: sql`excluded.description`,
        isActive: true,
        updatedAt: now,
      },
    })
    .returning({ id: genres.id, slug: genres.slug, name: genres.name, thaiName: genres.thaiName });
}

async function ensureTags(tx: Tx, tagNames: readonly string[], now: Date) {
  if (tagNames.length === 0) return [];
  return tx
    .insert(tags)
    .values(tagNames.map((name) => ({ slug: sourceTagSlug(name), name, createdAt: now, updatedAt: now })))
    .onConflictDoUpdate({
      target: tags.slug,
      set: { name: sql`excluded.name`, isActive: true, updatedAt: now },
    })
    .returning({ id: tags.id, slug: tags.slug, name: tags.name });
}

async function ensureAuthor(tx: Tx, name: string, now: Date) {
  const [row] = await tx
    .insert(authors)
    .values({ slug: sourceAuthorSlug(name), name, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: authors.slug,
      set: { name: sql`excluded.name`, updatedAt: now },
    })
    .returning({ id: authors.id, name: authors.name });
  return row;
}

async function refreshTagCounts(tx: Tx, tagIds: readonly string[], now: Date) {
  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length === 0) return;
  await tx
    .update(tags)
    .set({
      usageCount: sql`(
        select count(*)::int from ${novelTags}
        where ${novelTags.tagId} = ${tags.id}
      )`,
      updatedAt: now,
    })
    .where(inArray(tags.id, uniqueTagIds));
}

async function updateSearchDocument(
  tx: Tx,
  input: {
    novelId: string;
    title: string;
    titleOriginal: string | null;
    authorNames: readonly string[];
    genreNames: readonly string[];
    tagNames: readonly string[];
    now: Date;
  },
) {
  const searchText = [
    input.title,
    input.titleOriginal,
    ...input.authorNames,
    ...input.genreNames,
    ...input.tagNames,
  ]
    .filter(Boolean)
    .join(" ");
  await tx
    .insert(novelSearchDocuments)
    .values({ novelId: input.novelId, searchText, updatedAt: input.now })
    .onConflictDoUpdate({
      target: novelSearchDocuments.novelId,
      set: { searchText, updatedAt: input.now },
    });
}

async function upsertNovel(input: {
  book: MongoBook;
  coverKey: string | null;
  expectLegacyIdentity: boolean;
  lease: ImportLeaseHandle;
  mongoGenreMap: Map<string, MongoTag>;
  now: Date;
}) {
  const mongoBookId = validateMongoImportSourceId(input.book.bookId, "bookId");
  const bookTypes = uniqueCleanStrings(input.book.bookTypes);
  const tagNames = uniqueCleanStrings(input.book.bookTags, 160);
  const originalAuthorName = nonBlank(input.book.authorName);
  const translatorName = nonBlank(input.book.translatorName);
  const publishedAt = publicationDate(input.book, input.now);
  const synopsis = cleanText(input.book.bookIntroduction, 50_000)
    ?? cleanText(input.book.bookDetail, 50_000)
    ?? input.book.bookName;
  const legacySlug = sourceBookSlug(input.book);

  return getDb().transaction(async (tx) => {
    await assertImportLeaseForContentMutation(tx, input.lease);
    const [mapped] = await tx
      .select({
        id: novels.id,
        mongoBookId: novels.mongoBookId,
        slug: novels.slug,
        title: novels.title,
        coverKey: novels.coverKey,
      })
      .from(novels)
      .where(eq(novels.mongoBookId, mongoBookId))
      .for("update")
      .limit(1);
    let legacy: ImportedNovelIdentityCandidate | undefined;
    if (!mapped) {
      [legacy] = await tx
        .select({
          id: novels.id,
          mongoBookId: novels.mongoBookId,
          slug: novels.slug,
          title: novels.title,
          coverKey: novels.coverKey,
        })
        .from(novels)
        .where(and(eq(novels.slug, legacySlug), isNull(novels.mongoBookId)))
        .for("update")
        .limit(1);
    }
    const identity = planMongoImportedNovelIdentity({
      mongoBookId,
      title: input.book.bookName,
      legacySlug,
      expectLegacy: input.expectLegacyIdentity,
      mapped,
      legacy,
    });
    const mutableValues = {
      mongoBookId,
      title: input.book.bookName,
      synopsis,
      coverKey: input.coverKey ?? (identity.kind === "create" ? null : identity.row.coverKey),
      status: input.book.isFinished ? "COMPLETED" as const : "ONGOING" as const,
      publicationStatus: "PUBLISHED" as const,
      latestChapterAt: input.book.lastChapterUpdatedAt ?? null,
      updatedAt: input.now,
    };

    let novel: { id: string; slug: string; coverKey: string | null } | undefined;
    if (identity.kind === "create") {
      const slug = await createUniqueSlug(
        `${input.book.bookName}-${mongoBookId}`,
        async (candidate) => {
          const [row] = await tx
            .select({ id: novels.id })
            .from(novels)
            .where(eq(novels.slug, candidate))
            .limit(1);
          return Boolean(row);
        },
        "novel",
      );
      [novel] = await tx
        .insert(novels)
        .values({
          ...mutableValues,
          slug,
          titleOriginal: null,
          bannerKey: null,
          originalLanguage: null,
          language: "th",
          contentRating: "TEEN",
          publishedAt,
          createdAt: publishedAt,
        })
        .returning({ id: novels.id, slug: novels.slug, coverKey: novels.coverKey });
    } else {
      [novel] = await tx
        .update(novels)
        .set({
          ...mutableValues,
          publishedAt: sql`coalesce(${novels.publishedAt}, ${publishedAt})`,
        })
        .where(
          identity.kind === "claim"
            ? and(eq(novels.id, identity.row.id), isNull(novels.mongoBookId))
            : and(eq(novels.id, identity.row.id), eq(novels.mongoBookId, mongoBookId)),
        )
        .returning({ id: novels.id, slug: novels.slug, coverKey: novels.coverKey });
    }
    if (!novel) {
      throw new ApiError(
        409,
        "SYNC_IDENTITY_CONFLICT",
        `Mongo book ${mongoBookId} changed identity ownership while it was being imported`,
      );
    }

    const previousTagRows = await tx
      .select({ id: tags.id })
      .from(novelTags)
      .innerJoin(tags, eq(tags.id, novelTags.tagId))
      .where(eq(novelTags.novelId, novel.id));

    await tx.delete(novelAuthors).where(eq(novelAuthors.novelId, novel.id));
    await tx.delete(novelGenres).where(eq(novelGenres.novelId, novel.id));
    await tx.delete(novelTags).where(eq(novelTags.novelId, novel.id));

    const authorRows: { id: string; name: string; role: "ORIGINAL_AUTHOR" | "TRANSLATOR"; sortOrder: number }[] = [];
    if (originalAuthorName) {
      const row = await ensureAuthor(tx, originalAuthorName, input.now);
      authorRows.push({ ...row, role: "ORIGINAL_AUTHOR", sortOrder: 1 });
    }
    if (translatorName) {
      const row = await ensureAuthor(tx, translatorName, input.now);
      authorRows.push({ ...row, role: "TRANSLATOR", sortOrder: 2 });
    }
    if (authorRows.length) {
      await tx
        .insert(novelAuthors)
        .values(authorRows.map((row) => ({ novelId: novel.id, authorId: row.id, role: row.role, sortOrder: row.sortOrder })))
        .onConflictDoNothing();
    }

    const genreRows = await ensureGenres(tx, bookTypes, input.mongoGenreMap, input.now);
    if (genreRows.length) {
      await tx
        .insert(novelGenres)
        .values(genreRows.map((row, index) => ({ novelId: novel.id, genreId: row.id, isPrimary: index === 0, sortOrder: index + 1 })))
        .onConflictDoNothing();
    }

    const tagRows = await ensureTags(tx, tagNames, input.now);
    if (tagRows.length) {
      await tx.insert(novelTags).values(tagRows.map((row) => ({ novelId: novel.id, tagId: row.id }))).onConflictDoNothing();
    }
    await refreshTagCounts(tx, [...previousTagRows.map((row) => row.id), ...tagRows.map((row) => row.id)], input.now);

    await updateSearchDocument(tx, {
      novelId: novel.id,
      title: input.book.bookName,
      titleOriginal: null,
      authorNames: authorRows.map((row) => row.name),
      genreNames: genreRows.flatMap((row) => [row.name, row.thaiName].filter(Boolean) as string[]),
      tagNames: tagRows.map((row) => row.name),
      now: input.now,
    });

    await tx
      .insert(novelStatistics)
      .values({
        novelId: novel.id,
        viewCount: input.book.bookViews ?? 0,
        latestChapterAt: input.book.lastChapterUpdatedAt ?? null,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: novelStatistics.novelId,
        set: {
          viewCount: sql`greatest(${novelStatistics.viewCount}, excluded.view_count)`,
          updatedAt: input.now,
        },
      });

    return novel;
  });
}

function orderMap(orderDoc: MongoChapterOrder | null) {
  const result = new Map<string, { sortOrder: number; addedAt?: Date }>();
  for (const [index, item] of (orderDoc?.chapters ?? []).entries()) {
    if (item.isPublished === false) continue;
    result.set(item.chapterId, { sortOrder: index + 1, addedAt: item.addedAt });
  }
  return result;
}

function normalizeChapterContent(value: unknown) {
  if (typeof value !== "string") return "";
  return htmlToText(value).replace(/\n{3,}/gu, "\n\n").trim();
}

async function loadSortedChapters(input: {
  bookId: string;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
}) {
  const orderDoc = await input.orderCollection.findOne({ bookId: input.bookId });
  const ordered = orderMap(orderDoc);
  const mongoChapters = await input.chaptersCollection
    .find({
      bookId: input.bookId,
      publishStatus: "published",
      isDelete: false,
      isVerified: true,
    })
    .toArray();
  const sortedChapters = mongoChapters.toSorted((left, right) => {
      const leftOrder = ordered.get(left.chapterId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = ordered.get(right.chapterId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return (left.publishedAt?.getTime() ?? 0) - (right.publishedAt?.getTime() ?? 0);
    });
  validateMongoImportSourceIds(sortedChapters.map((chapter) => chapter.chapterId), "chapterId");
  return { ordered, chapters: sortedChapters };
}

async function refreshNovelChapterStatistics(tx: Tx, input: { novelId: string; viewCount: number; now: Date }) {
  const [counts] = await tx
    .select({
      total: sql<number>`count(*) filter (where ${chapters.deletedAt} is null)::int`.mapWith(Number),
      published: sql<number>`count(*) filter (where ${chapters.deletedAt} is null and ${chapters.status} = 'PUBLISHED')::int`.mapWith(Number),
    })
    .from(chapters)
    .where(eq(chapters.novelId, input.novelId));
  const [latest] = await tx
    .select({ id: chapters.id, publishedAt: chapters.publishedAt })
    .from(chapters)
    .where(and(eq(chapters.novelId, input.novelId), eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt)))
    .orderBy(desc(chapters.sortOrder), desc(chapters.id))
    .limit(1);
  const values = {
    latestChapterId: latest?.id ?? null,
    totalChapters: Number(counts?.total ?? 0),
    publishedChapters: Number(counts?.published ?? 0),
    latestChapterAt: latest?.publishedAt ?? null,
    updatedAt: input.now,
  };
  await tx
    .insert(novelStatistics)
    .values({ novelId: input.novelId, ...values, viewCount: input.viewCount })
    .onConflictDoUpdate({
      target: novelStatistics.novelId,
      set: {
        ...values,
        viewCount: sql`greatest(${novelStatistics.viewCount}, ${input.viewCount})`,
      },
    });
  await tx.update(novels).set({ latestChapterAt: values.latestChapterAt, updatedAt: input.now }).where(eq(novels.id, input.novelId));
}

async function importChapterChunk(input: {
  novelId: string;
  book: MongoBook;
  lease: ImportLeaseHandle;
  sortedChapters: readonly MongoChapter[];
  ordered: Map<string, { sortOrder: number; addedAt?: Date }>;
  chapterOffset: number;
  chapterLimit: number;
  now: Date;
}): Promise<ChapterImportResult> {
  const chunk = input.sortedChapters.slice(input.chapterOffset, input.chapterOffset + input.chapterLimit);
  let imported = 0;
  let paid = 0;
  let skipped = 0;

  await getDb().transaction(async (tx) => {
    await assertImportLeaseForContentMutation(tx, input.lease);
    const [parentNovel] = await tx
      .select({ id: novels.id })
      .from(novels)
      .where(eq(novels.id, input.novelId))
      .for("no key update")
      .limit(1);
    if (!parentNovel) {
      throw new ApiError(409, "SYNC_IDENTITY_CONFLICT", "The imported novel no longer exists");
    }
    const [maxima] = await tx
      .select({
        chapterNumber: max(chapters.chapterNumber),
        sortOrder: max(chapters.sortOrder),
      })
      .from(chapters)
      .where(eq(chapters.novelId, input.novelId));
    let nextChapterNumber = Number(maxima?.chapterNumber ?? 0) + 1;
    let nextSortOrder = Number(maxima?.sortOrder ?? 0) + 1;

    for (const [chunkIndex, chapter] of chunk.entries()) {
      const sourceIndex = input.chapterOffset + chunkIndex;
      const mongoChapterId = validateMongoImportSourceId(chapter.chapterId, "chapterId");
      const content = normalizeChapterContent(chapter.chapterContent);
      if (!content || Buffer.byteLength(content, "utf8") > MAX_CHAPTER_UTF8_BYTES) {
        skipped += 1;
        continue;
      }
      const title = nonBlank(chapter.chapterTitle) ?? `Chapter ${sourceIndex + 1}`;
      const access = mapImportedChapterAccess(chapter.chapterPrice);
      if (!access.isFree) paid += 1;
      const publishedAt = chapter.publishedAt ?? input.ordered.get(chapter.chapterId)?.addedAt ?? chapter.createdAt ?? input.now;
      const [mapped] = await tx
        .select({
          id: chapters.id,
          mongoChapterId: chapters.mongoChapterId,
          chapterNumber: chapters.chapterNumber,
          sortOrder: chapters.sortOrder,
          slug: chapters.slug,
          title: chapters.title,
          content: chapters.content,
          publishedAt: chapters.publishedAt,
        })
        .from(chapters)
        .where(and(eq(chapters.novelId, input.novelId), eq(chapters.mongoChapterId, mongoChapterId)))
        .for("update")
        .limit(1);
      let legacy: ImportedChapterIdentityCandidate | undefined;
      if (!mapped) {
        const position = sourceIndex + 1;
        const legacyRows = await tx
          .select({
            id: chapters.id,
            mongoChapterId: chapters.mongoChapterId,
            chapterNumber: chapters.chapterNumber,
            sortOrder: chapters.sortOrder,
            slug: chapters.slug,
            title: chapters.title,
            content: chapters.content,
            publishedAt: chapters.publishedAt,
          })
          .from(chapters)
          .where(
            and(
              eq(chapters.novelId, input.novelId),
              isNull(chapters.mongoChapterId),
              or(
                eq(chapters.chapterNumber, position),
                eq(chapters.sortOrder, position),
                eq(chapters.slug, `chapter-${position}`),
              ),
            ),
          )
          .for("update");
        if (legacyRows.length > 1) {
          throw new ApiError(
            409,
            "SYNC_IDENTITY_CONFLICT",
            `Multiple legacy chapters could match Mongo chapter ${mongoChapterId}; reconcile them before retrying sync`,
          );
        }
        [legacy] = legacyRows;
      }
      const identity = planMongoImportedChapterIdentity({
        mongoChapterId,
        sourceIndex,
        title,
        content,
        mapped,
        legacy,
      });
      const mutableValues = {
        title,
        content,
        excerpt: content.slice(0, 1_200),
        wordCount: countChapterWords(content),
        status: "PUBLISHED" as const,
        isFree: access.isFree,
        coinPrice: access.coinPrice,
        updatedAt: input.now,
      };

      if (identity.kind === "append") {
        const chapterNumber = Number(nextChapterNumber.toFixed(2));
        const sortOrder = nextSortOrder;
        const slug = await createUniqueSlug(
          `chapter-${sortOrder}`,
          async (candidate) => {
            const [row] = await tx
              .select({ id: chapters.id })
              .from(chapters)
              .where(and(eq(chapters.novelId, input.novelId), eq(chapters.slug, candidate)))
              .limit(1);
            return Boolean(row);
          },
          "chapter",
        );
        await tx.insert(chapters).values({
          ...mutableValues,
          novelId: input.novelId,
          mongoChapterId,
          chapterNumber,
          sortOrder,
          slug,
          publishedAt,
          createdAt: chapter.createdAt ?? publishedAt,
        });
        nextChapterNumber = chapterNumber + 1;
        nextSortOrder = sortOrder + 1;
      } else {
        const [updated] = await tx
          .update(chapters)
          .set({
            ...mutableValues,
            ...(identity.kind === "claim" ? { mongoChapterId } : {}),
            publishedAt: sql`coalesce(${chapters.publishedAt}, ${publishedAt})`,
          })
          .where(
            identity.kind === "claim"
              ? and(eq(chapters.id, identity.row.id), isNull(chapters.mongoChapterId))
              : and(eq(chapters.id, identity.row.id), eq(chapters.mongoChapterId, mongoChapterId)),
          )
          .returning({ id: chapters.id });
        if (!updated) {
          throw new ApiError(
            409,
            "SYNC_IDENTITY_CONFLICT",
            `Mongo chapter ${mongoChapterId} changed identity ownership while it was being imported`,
          );
        }
      }
      imported += 1;
    }
    await refreshNovelChapterStatistics(tx, {
      novelId: input.novelId,
      viewCount: input.book.bookViews ?? 0,
      now: input.now,
    });
  });

  const nextOffset = Math.min(input.chapterOffset + chunk.length, input.sortedChapters.length);
  return {
    imported,
    paid,
    skipped,
    sourceChapters: input.sortedChapters.length,
    processedSourceChapters: chunk.length,
    nextOffset,
    complete: nextOffset >= input.sortedChapters.length,
  };
}

async function processBookChunk(input: {
  book: MongoBook;
  expectLegacyNovelIdentity: boolean;
  offset: number;
  lease: ImportLeaseHandle;
  options: ImportOptions;
  mongoGenreMap: Map<string, MongoTag>;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
}) {
  const mongoBookId = validateMongoImportSourceId(input.book.bookId, "bookId");
  const sorted = await loadSortedChapters({
    bookId: input.book.bookId,
    chaptersCollection: input.chaptersCollection,
    orderCollection: input.orderCollection,
  });

  if (!input.options.execute) {
    const chunk = sorted.chapters.slice(input.offset, input.offset + input.options.chapterLimit);
    return {
      result: {
        imported: 0,
        paid: chunk.filter((chapter) => mapImportedChapterAccess(chapter.chapterPrice).coinPrice === 1).length,
        skipped: 0,
        sourceChapters: sorted.chapters.length,
        processedSourceChapters: chunk.length,
        nextOffset: Math.min(input.offset + chunk.length, sorted.chapters.length),
        complete: input.offset + chunk.length >= sorted.chapters.length,
      } satisfies ChapterImportResult,
      uploadedCover: false,
      skippedCover: false,
      coverCandidate: Boolean(input.book.bookCover),
    };
  }

  let coverKey: string | null = null;
  let uploadedCover = false;
  let skippedCover = false;
  const legacySlug = sourceBookSlug(input.book);
  const identityCandidates = await getDb()
    .select({
      id: novels.id,
      mongoBookId: novels.mongoBookId,
      slug: novels.slug,
      title: novels.title,
      coverKey: novels.coverKey,
    })
    .from(novels)
    .where(
      or(
        eq(novels.mongoBookId, mongoBookId),
        and(eq(novels.slug, legacySlug), isNull(novels.mongoBookId)),
      ),
    )
    .limit(2);
  const mapped = identityCandidates.find((candidate) => candidate.mongoBookId === mongoBookId);
  const legacy = mapped
    ? undefined
    : identityCandidates.find((candidate) => candidate.slug === legacySlug);
  const plannedIdentity = planMongoImportedNovelIdentity({
    mongoBookId,
    title: input.book.bookName,
    legacySlug,
    expectLegacy: input.expectLegacyNovelIdentity,
    mapped,
    legacy,
  });
  const existingCoverKey = plannedIdentity.kind === "create" ? null : plannedIdentity.row.coverKey;
  try {
    coverKey = await ensureCover(input.book, existingCoverKey, input.options);
    uploadedCover = Boolean(coverKey && coverKey !== existingCoverKey);
  } catch (error) {
    skippedCover = true;
    logger.warn("Skipping unavailable Mongo cover during translated novel import", {
      error,
      sourceBookId: input.book.bookId,
    });
  }

  const novel = await upsertNovel({
    book: input.book,
    coverKey,
    expectLegacyIdentity: input.expectLegacyNovelIdentity,
    lease: input.lease,
    mongoGenreMap: input.mongoGenreMap,
    now: input.options.now,
  });
  const result = await importChapterChunk({
    novelId: novel.id,
    book: input.book,
    lease: input.lease,
    sortedChapters: sorted.chapters,
    ordered: sorted.ordered,
    chapterOffset: input.offset,
    chapterLimit: input.options.chapterLimit,
    now: input.options.now,
  });

  return {
    result,
    uploadedCover,
    skippedCover,
    coverCandidate: Boolean(input.book.bookCover),
  };
}

function createSummary(options: ImportOptions, mode: "backfill" | "incremental" | "idle") {
  return {
    dryRun: !options.execute,
    mode,
    selectedBooks: 0,
    completedBooks: 0,
    partialBooks: 0,
    importedChapters: 0,
    paidChapters: 0,
    skippedChapters: 0,
    processedSourceChapters: 0,
    coverCandidates: 0,
    uploadedCovers: 0,
    skippedCovers: 0,
    stoppedForRuntime: false,
    backfillComplete: false,
    incrementalDue: false,
    nextAfterBookId: null as string | null,
    currentBookId: null as string | null,
    currentChapterOffset: null as number | null,
  };
}

async function runBackfill(input: {
  state: ImportCursorState;
  lease: ImportLeaseHandle;
  options: ImportOptions;
  startedAt: number;
  booksCollection: Collection<MongoBook>;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
  mongoGenreMap: Map<string, MongoTag>;
}) {
  const summary = createSummary(input.options, "backfill");
  let snapshotChanged = false;
  if (input.state.backfillHighWaterBookId === undefined) {
    input.state.backfillHighWaterBookId = await captureBackfillHighWaterBookId(input.booksCollection);
    input.state.backfillStartedAt ??= input.options.now.toISOString();
    snapshotChanged = true;
  } else if (!input.state.backfillStartedAt) {
    // Cursors created before backfillStartedAt cannot prove when their snapshot
    // began. Epoch forces a safe full first incremental sweep instead of a gap.
    input.state.backfillStartedAt = new Date(0).toISOString();
    snapshotChanged = true;
  }
  if (input.options.execute && snapshotChanged) await saveCursorState(input.state, input.options.now, input.lease);
  let processedBooks = 0;
  while (processedBooks < input.options.bookLimit) {
    if (!hasRuntimeBudget(input.startedAt, input.options)) {
      summary.stoppedForRuntime = true;
      break;
    }

    const selection = await loadNextBackfillBook(input.booksCollection, input.state);
    if (selection.missingCurrentBook) {
      clearMissingTranslatedNovelBackfillCursor(input.state);
      if (input.options.execute) await saveCursorState(input.state, input.options.now, input.lease);
    }
    const { book } = selection;
    if (!book) {
      summary.backfillComplete = true;
      if (input.options.execute) {
        input.state.backfillCompletedAt = input.options.now.toISOString();
        if (input.state.sourceIdentityVersion === 0) {
          input.state.sourceIdentityVersion = 1;
          delete input.state.legacyIdentityThroughBookId;
        }
        delete input.state.currentBookId;
        delete input.state.chapterOffset;
        await saveCursorState(input.state, input.options.now, input.lease);
      }
      break;
    }

    const offset = input.state.currentBookId === book.bookId ? input.state.chapterOffset ?? 0 : 0;
    const output = await processBookChunk({
      book,
      expectLegacyNovelIdentity: shouldRequireLegacyMongoNovelIdentity(input.state, book.bookId),
      offset,
      lease: input.lease,
      options: input.options,
      mongoGenreMap: input.mongoGenreMap,
      chaptersCollection: input.chaptersCollection,
      orderCollection: input.orderCollection,
    });

    summary.selectedBooks += 1;
    summary.importedChapters += output.result.imported;
    summary.paidChapters += output.result.paid;
    summary.skippedChapters += output.result.skipped;
    summary.processedSourceChapters += output.result.processedSourceChapters;
    summary.coverCandidates += output.coverCandidate ? 1 : 0;
    summary.uploadedCovers += output.uploadedCover ? 1 : 0;
    summary.skippedCovers += output.skippedCover ? 1 : 0;

    if (output.result.complete) {
      processedBooks += 1;
      summary.completedBooks += 1;
      summary.nextAfterBookId = book.bookId;
      input.state.afterBookId = book.bookId;
      delete input.state.currentBookId;
      delete input.state.chapterOffset;
    } else {
      summary.partialBooks += 1;
      summary.currentBookId = book.bookId;
      summary.currentChapterOffset = output.result.nextOffset;
      input.state.currentBookId = book.bookId;
      input.state.chapterOffset = output.result.nextOffset;
    }

    if (input.options.execute) await saveCursorState(input.state, input.options.now, input.lease);
    if (!output.result.complete) break;
  }
  return summary;
}

function isIncrementalDue(state: ImportCursorState, now: Date) {
  const incremental = state.incremental;
  if (incremental?.active) return true;
  const last = incremental?.lastSweepCompletedAt ?? state.backfillCompletedAt;
  if (!last) return false;
  return now.getTime() - new Date(last).getTime() >= INCREMENTAL_INTERVAL_MS;
}

export function getTranslatedNovelIncrementalLowerBound(state: ImportCursorState, now: Date) {
  const anchor = state.incremental?.lastSweepCompletedAt
    ?? state.backfillStartedAt
    ?? state.backfillCompletedAt
    ?? now.toISOString();
  return new Date(new Date(anchor).getTime() - INCREMENTAL_SAFETY_WINDOW_MS).toISOString();
}

function startIncrementalState(state: ImportCursorState, now: Date) {
  const lowerBound = getTranslatedNovelIncrementalLowerBound(state, now);
  state.incremental = {
    active: true,
    lastSweepCompletedAt: state.incremental?.lastSweepCompletedAt,
    sweepUntil: now.toISOString(),
    afterUpdatedAt: lowerBound,
    afterBookId: "",
  };
  return state.incremental;
}

async function runIncremental(input: {
  state: ImportCursorState;
  lease: ImportLeaseHandle;
  options: ImportOptions;
  startedAt: number;
  booksCollection: Collection<MongoBook>;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
  mongoGenreMap: Map<string, MongoTag>;
}) {
  const summary = createSummary(input.options, "incremental");
  summary.incrementalDue = input.options.mode === "incremental" || isIncrementalDue(input.state, input.options.now);
  if (!summary.incrementalDue && input.options.mode === "auto") return summary;

  const incremental = input.state.incremental?.active
    ? input.state.incremental
    : startIncrementalState(input.state, input.options.now);

  let processedBooks = 0;
  while (processedBooks < input.options.bookLimit) {
    if (!hasRuntimeBudget(input.startedAt, input.options)) {
      summary.stoppedForRuntime = true;
      break;
    }

    const selection = await loadIncrementalBook(input.booksCollection, incremental, input.options.now);
    if (selection.missingCurrentBook) {
      clearMissingTranslatedNovelIncrementalCursor(incremental);
      if (input.options.execute) await saveCursorState(input.state, input.options.now, input.lease);
      continue;
    }
    const { book } = selection;
    if (!book) {
      incremental.active = false;
      incremental.lastSweepCompletedAt = incremental.sweepUntil ?? input.options.now.toISOString();
      clearMissingTranslatedNovelIncrementalCursor(incremental);
      delete incremental.afterBookId;
      delete incremental.afterUpdatedAt;
      if (input.options.execute) await saveCursorState(input.state, input.options.now, input.lease);
      break;
    }

    const offset = incremental.currentBookId === book.bookId ? incremental.chapterOffset ?? 0 : 0;
    const frozenUpdatedAt = resolveTranslatedNovelIncrementalOrderingTimestamp({
      incremental,
      bookId: book.bookId,
      sourceUpdatedAt: book.lastChapterUpdatedAt,
      now: input.options.now,
    });
    const output = await processBookChunk({
      book,
      expectLegacyNovelIdentity: shouldRequireLegacyMongoNovelIdentity(input.state, book.bookId),
      offset,
      lease: input.lease,
      options: input.options,
      mongoGenreMap: input.mongoGenreMap,
      chaptersCollection: input.chaptersCollection,
      orderCollection: input.orderCollection,
    });

    summary.selectedBooks += 1;
    summary.importedChapters += output.result.imported;
    summary.paidChapters += output.result.paid;
    summary.skippedChapters += output.result.skipped;
    summary.processedSourceChapters += output.result.processedSourceChapters;
    summary.coverCandidates += output.coverCandidate ? 1 : 0;
    summary.uploadedCovers += output.uploadedCover ? 1 : 0;
    summary.skippedCovers += output.skippedCover ? 1 : 0;

    if (output.result.complete) {
      processedBooks += 1;
      summary.completedBooks += 1;
      completeTranslatedNovelIncrementalBook(incremental, book.bookId, frozenUpdatedAt);
    } else {
      summary.partialBooks += 1;
      summary.currentBookId = book.bookId;
      summary.currentChapterOffset = output.result.nextOffset;
      incremental.currentBookId = book.bookId;
      incremental.currentBookUpdatedAt = frozenUpdatedAt;
      incremental.chapterOffset = output.result.nextOffset;
    }

    if (input.options.execute) await saveCursorState(input.state, input.options.now, input.lease);
    if (!output.result.complete) break;
  }

  return summary;
}

export async function getTranslatedNovelImportStatus(now = new Date()) {
  loadLocalDotEnv();
  const [state, [leaseSetting]] = await Promise.all([
    loadCursorState(),
    getDb()
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, IMPORT_LEASE_KEY))
      .limit(1),
  ]);
  const job = inspectTranslatedNovelImportLease(leaseSetting?.value, now);
  const [postgresCountRow] = await getDb().execute<{
    novels: number;
    publishedNovels: number;
    chapters: number;
    paidChapters: number;
    covers: number;
  }>(sql`
    select
      (select count(*)::int from ${novels}) as "novels",
      (select count(*)::int from ${novels}
        where ${novels.publicationStatus} = 'PUBLISHED' and ${novels.deletedAt} is null) as "publishedNovels",
      (select count(*)::int from ${chapters}) as "chapters",
      (select count(*)::int from ${chapters} where ${chapters.isFree} = false) as "paidChapters",
      (select count(*)::int from ${novels}
        where ${novels.coverKey} is not null and ${novels.deletedAt} is null) as "covers"
  `);
  const postgresCounts = {
    novels: Number(postgresCountRow?.novels ?? 0),
    publishedNovels: Number(postgresCountRow?.publishedNovels ?? 0),
    chapters: Number(postgresCountRow?.chapters ?? 0),
    paidChapters: Number(postgresCountRow?.paidChapters ?? 0),
    covers: Number(postgresCountRow?.covers ?? 0),
  };

  let mongo:
    | {
        configured: true;
        targetBooks: number;
        backfillProcessedBooks: number | null;
        nextBackfillBook: {
          bookId: string;
          bookName: string;
          totalChapters?: number;
          lastChapterUpdatedAt?: string;
        } | null;
      }
    | { configured: false; error: string };
  try {
    const mongoEnv = requireMongoEnv();
    const client = new MongoClient(mongoEnv.MONGODB_URL, {
      connectTimeoutMS: MONGO_CONNECT_TIMEOUT_MS,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: MONGO_SOCKET_TIMEOUT_MS,
    });
    await client.connect();
    try {
      const booksCollection = client.db(MONGO_DATABASE).collection<MongoBook>("books");
      const highWaterBookId = state.backfillHighWaterBookId;
      const targetBooks = highWaterBookId === null
        ? 0
        : await booksCollection.countDocuments(
            highWaterBookId === undefined
              ? TRANSLATED_NOVEL_QUERY
              : { ...TRANSLATED_NOVEL_QUERY, bookId: { $lte: highWaterBookId } },
          );
      const processedUpperBookId = state.afterBookId && highWaterBookId
        ? state.afterBookId < highWaterBookId
          ? state.afterBookId
          : highWaterBookId
        : state.afterBookId;
      const backfillProcessedBooks = processedUpperBookId && highWaterBookId !== null
        ? await booksCollection.countDocuments({
            ...TRANSLATED_NOVEL_QUERY,
            bookId: { $lte: processedUpperBookId },
          })
        : 0;
      const nextBackfillSelection = state.backfillCompletedAt
        ? null
        : await loadNextBackfillBook(booksCollection, state);
      const nextBackfillBook = nextBackfillSelection?.book ?? null;
      mongo = {
        configured: true,
        targetBooks,
        backfillProcessedBooks,
        nextBackfillBook: nextBackfillBook
          ? {
              bookId: nextBackfillBook.bookId,
              bookName: nextBackfillBook.bookName,
              totalChapters: nextBackfillBook.totalChapters,
              lastChapterUpdatedAt: nextBackfillBook.lastChapterUpdatedAt?.toISOString(),
            }
          : null,
      };
    } finally {
      await client.close();
    }
  } catch (error) {
    mongo = { configured: false, error: error instanceof Error ? error.message : "MongoDB status unavailable" };
  }

  const lastSweep = state.incremental?.lastSweepCompletedAt ?? state.backfillCompletedAt ?? null;
  const nextIncrementalDueAt = lastSweep
    ? new Date(new Date(lastSweep).getTime() + INCREMENTAL_INTERVAL_MS).toISOString()
    : null;

  return {
    cursor: normalizedStateValue(state),
    backfill: {
      completed: Boolean(state.backfillCompletedAt),
      completedAt: state.backfillCompletedAt ?? null,
      highWaterBookId: state.backfillHighWaterBookId ?? null,
      afterBookId: state.afterBookId ?? null,
      currentBookId: state.currentBookId ?? null,
      chapterOffset: state.chapterOffset ?? 0,
    },
    incremental: {
      active: state.incremental?.active ?? false,
      lastSweepCompletedAt: state.incremental?.lastSweepCompletedAt ?? null,
      nextDueAt: nextIncrementalDueAt,
      dueNow: Boolean(state.backfillCompletedAt && isIncrementalDue(state, now)),
      currentBookId: state.incremental?.currentBookId ?? null,
      chapterOffset: state.incremental?.chapterOffset ?? 0,
      sweepUntil: state.incremental?.sweepUntil ?? null,
      afterUpdatedAt: state.incremental?.afterUpdatedAt ?? null,
      afterBookId: state.incremental?.afterBookId ?? null,
    },
    postgres: postgresCounts,
    mongo,
    job,
    lastRun: state.lastRun ?? null,
  };
}

export async function runTranslatedNovelImport(options = parseOptions()) {
  loadLocalDotEnv();
  const mongoEnv = requireMongoEnv();
  const startedAt = Date.now();
  const lease = await acquireImportLease(options.maxRuntimeMs + LEASE_EXPIRY_BUFFER_MS);
  const client = new MongoClient(mongoEnv.MONGODB_URL, {
    connectTimeoutMS: MONGO_CONNECT_TIMEOUT_MS,
    serverSelectionTimeoutMS: 15_000,
    socketTimeoutMS: MONGO_SOCKET_TIMEOUT_MS,
  });
  try {
    const state = await loadCursorState();
    const identityCursor = initializeMongoSourceIdentityCursor(state);
    if (options.execute && identityCursor.changed) {
      await saveCursorState(state, options.now, lease);
    }
    assertTranslatedNovelIncrementalReady(options.mode, state.backfillCompletedAt);
    await client.connect();
    const mongoDb = client.db(MONGO_DATABASE);
    const booksCollection = mongoDb.collection<MongoBook>("books");
    const chaptersCollection = mongoDb.collection<MongoChapter>("chapters");
    const orderCollection = mongoDb.collection<MongoChapterOrder>("books-chapters-order");
    const mongoGenreMap = await loadMongoGenreMap(mongoDb.collection<MongoTag>("tags"));
    let result: ReturnType<typeof createSummary>;
    if (options.mode === "backfill" || (options.mode === "auto" && !state.backfillCompletedAt)) {
      result = await runBackfill({
        state,
        lease,
        options,
        startedAt,
        booksCollection,
        chaptersCollection,
        orderCollection,
        mongoGenreMap,
      });
    } else if (options.mode === "incremental" || options.mode === "auto") {
      result = await runIncremental({
        state,
        lease,
        options,
        startedAt,
        booksCollection,
        chaptersCollection,
        orderCollection,
        mongoGenreMap,
      });
    } else {
      result = createSummary(options, "idle");
    }

    if (options.execute) {
      state.lastRun = {
        at: options.now.toISOString(),
        mode: result.mode,
        dryRun: result.dryRun,
        summary: result as unknown as Record<string, unknown>,
      };
      await saveCursorState(state, options.now, lease);
    }
    return result;
  } finally {
    try {
      await client.close();
    } finally {
      await releaseImportLease(lease);
    }
  }
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runTranslatedNovelImport()
    .then((result) => logger.info("Mongo translated novel import completed", result as unknown as Record<string, unknown>))
    .catch((error: unknown) => {
      logger.error("Mongo translated novel import failed", { error });
      process.exitCode = 1;
    })
    .finally(async () => {
      destroyR2Client();
      await closeDbConnection();
    });
}
