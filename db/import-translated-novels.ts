import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { MongoClient, type Collection, type Filter } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDbConnection, getDb } from "@/db";
import {
  authors,
  chapters,
  genres,
  mediaAssets,
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
import { logger } from "@/lib/logger";
import { destroyR2Client, getR2Client } from "@/lib/r2/client";
import { detectImageContentType } from "@/lib/r2/signatures";
import { slugify } from "@/lib/validation/slug";
import { generateObjectKey, MAX_UPLOAD_BYTES } from "@/lib/validation/upload";

const IMPORT_CURSOR_KEY = "jobs.mongo_translated_novel_import.cursor";
const DEFAULT_BOOK_LIMIT = 5;
const MAX_BOOK_LIMIT = 50;
const DEFAULT_CHAPTER_LIMIT = 100;
const MAX_CHAPTER_LIMIT = 1_000;
const DEFAULT_MAX_RUNTIME_SECONDS = 600;
const MAX_RUNTIME_SECONDS = 1_500;
const RUNTIME_STOP_BUFFER_MS = 30_000;
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

type IncrementalCursorState = {
  active: boolean;
  lastSweepCompletedAt?: string;
  sweepUntil?: string;
  afterUpdatedAt?: string;
  afterBookId?: string;
  currentBookId?: string;
  chapterOffset?: number;
};

type LastRunState = {
  at: string;
  mode: string;
  dryRun: boolean;
  summary: Record<string, unknown>;
};

type ImportCursorState = {
  afterBookId?: string;
  currentBookId?: string;
  chapterOffset?: number;
  backfillCompletedAt?: string;
  incremental?: IncrementalCursorState;
  lastRun?: LastRunState;
};

type ImportedChapterAccess = {
  isFree: boolean;
  coinPrice: number;
};

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

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

function normalizeCursorState(value: unknown): ImportCursorState {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const state: ImportCursorState = {};
  if (typeof source.afterBookId === "string") state.afterBookId = source.afterBookId;
  if (typeof source.currentBookId === "string") state.currentBookId = source.currentBookId;
  if (Number.isSafeInteger(source.chapterOffset) && Number(source.chapterOffset) >= 0) {
    state.chapterOffset = Number(source.chapterOffset);
  }
  if (typeof source.backfillCompletedAt === "string") state.backfillCompletedAt = source.backfillCompletedAt;
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
    ...(state.backfillCompletedAt ? { backfillCompletedAt: state.backfillCompletedAt } : {}),
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
  return normalizeCursorState(setting?.value);
}

async function saveCursorState(state: ImportCursorState, now: Date) {
  await getDb()
    .insert(siteSettings)
    .values({
      key: IMPORT_CURSOR_KEY,
      value: normalizedStateValue(state),
      description: "Cursor for bounded Mongo translated novel import and incremental sync",
      isPublic: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: normalizedStateValue(state), updatedAt: now },
    });
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

async function loadNextBackfillBook(collection: Collection<MongoBook>, state: ImportCursorState) {
  if (state.currentBookId) {
    return collection.findOne({ ...TRANSLATED_NOVEL_QUERY, bookId: state.currentBookId });
  }
  const query: Filter<MongoBook> = state.afterBookId
    ? { ...TRANSLATED_NOVEL_QUERY, bookId: { $gt: state.afterBookId } }
    : TRANSLATED_NOVEL_QUERY;
  const [book] = await collection.find(query).sort({ bookId: 1 }).limit(1).toArray();
  if (book || !state.afterBookId) return book ?? null;
  return collection.find(TRANSLATED_NOVEL_QUERY).sort({ bookId: 1 }).limit(1).next();
}

async function loadIncrementalBook(
  collection: Collection<MongoBook>,
  incremental: IncrementalCursorState,
  now: Date,
) {
  if (incremental.currentBookId) {
    return collection.findOne({ ...TRANSLATED_NOVEL_QUERY, bookId: incremental.currentBookId });
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
  return collection.find(query).sort({ lastChapterUpdatedAt: 1, bookId: 1 }).limit(1).next();
}

async function putCoverToR2(input: {
  sourceUrl: string;
  bookId: string;
  title: string;
  now: Date;
}) {
  const response = await fetch(input.sourceUrl, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.1" },
  });
  if (!response.ok) throw new Error(`Cover fetch failed with HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
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
  if (!sourceUrl || !/^https?:\/\//iu.test(sourceUrl)) return null;
  return putCoverToR2({ sourceUrl, bookId: book.bookId, title: book.bookName, now: options.now });
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
  mongoGenreMap: Map<string, MongoTag>;
  now: Date;
}) {
  const bookTypes = uniqueCleanStrings(input.book.bookTypes);
  const tagNames = uniqueCleanStrings(input.book.bookTags, 160);
  const originalAuthorName = nonBlank(input.book.authorName);
  const translatorName = nonBlank(input.book.translatorName);
  const publishedAt = publicationDate(input.book, input.now);
  const synopsis = cleanText(input.book.bookIntroduction, 50_000)
    ?? cleanText(input.book.bookDetail, 50_000)
    ?? input.book.bookName;
  const slug = sourceBookSlug(input.book);

  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: novels.id, coverKey: novels.coverKey })
      .from(novels)
      .where(eq(novels.slug, slug))
      .for("no key update")
      .limit(1);
    const [novel] = await tx
      .insert(novels)
      .values({
        slug,
        title: input.book.bookName,
        titleOriginal: null,
        synopsis,
        coverKey: input.coverKey ?? existing?.coverKey ?? null,
        bannerKey: null,
        originalLanguage: null,
        language: "th",
        status: input.book.isFinished ? "COMPLETED" : "ONGOING",
        publicationStatus: "PUBLISHED",
        contentRating: "TEEN",
        latestChapterAt: input.book.lastChapterUpdatedAt ?? null,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: novels.slug,
        set: {
          title: sql`excluded.title`,
          synopsis: sql`excluded.synopsis`,
          coverKey: sql`coalesce(excluded.cover_key, ${novels.coverKey})`,
          status: sql`excluded.status`,
          publicationStatus: "PUBLISHED",
          latestChapterAt: sql`excluded.latest_chapter_at`,
          publishedAt: sql`coalesce(${novels.publishedAt}, excluded.published_at)`,
          updatedAt: input.now,
        },
      })
      .returning({ id: novels.id, slug: novels.slug, coverKey: novels.coverKey });

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
  return {
    ordered,
    chapters: mongoChapters.toSorted((left, right) => {
      const leftOrder = ordered.get(left.chapterId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = ordered.get(right.chapterId)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return (left.publishedAt?.getTime() ?? 0) - (right.publishedAt?.getTime() ?? 0);
    }),
  };
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
    for (const [chunkIndex, chapter] of chunk.entries()) {
      const sourceIndex = input.chapterOffset + chunkIndex;
      const content = normalizeChapterContent(chapter.chapterContent);
      if (!content || Buffer.byteLength(content, "utf8") > MAX_CHAPTER_UTF8_BYTES) {
        skipped += 1;
        continue;
      }
      const chapterNumber = sourceIndex + 1;
      const access = mapImportedChapterAccess(chapter.chapterPrice);
      if (!access.isFree) paid += 1;
      const publishedAt = chapter.publishedAt ?? input.ordered.get(chapter.chapterId)?.addedAt ?? chapter.createdAt ?? input.now;
      await tx
        .insert(chapters)
        .values({
          novelId: input.novelId,
          chapterNumber,
          sortOrder: chapterNumber,
          slug: `chapter-${chapterNumber}`,
          title: nonBlank(chapter.chapterTitle) ?? `Chapter ${chapterNumber}`,
          content,
          excerpt: content.slice(0, 1_200),
          wordCount: countChapterWords(content),
          status: "PUBLISHED",
          isFree: access.isFree,
          coinPrice: access.coinPrice,
          publishedAt,
          createdAt: chapter.createdAt ?? publishedAt,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [chapters.novelId, chapters.chapterNumber],
          set: {
            sortOrder: sql`excluded.sort_order`,
            slug: sql`excluded.slug`,
            title: sql`excluded.title`,
            content: sql`excluded.content`,
            excerpt: sql`excluded.excerpt`,
            wordCount: sql`excluded.word_count`,
            status: "PUBLISHED",
            isFree: sql`excluded.is_free`,
            coinPrice: sql`excluded.coin_price`,
            publishedAt: sql`coalesce(${chapters.publishedAt}, excluded.published_at)`,
            updatedAt: input.now,
          },
        });
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

async function existingChapterOffset(book: MongoBook) {
  const slug = sourceBookSlug(book);
  const [row] = await getDb()
    .select({ value: max(chapters.sortOrder) })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(eq(novels.slug, slug))
    .limit(1);
  return Number(row?.value ?? 0);
}

async function processBookChunk(input: {
  book: MongoBook;
  offset: number;
  options: ImportOptions;
  mongoGenreMap: Map<string, MongoTag>;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
}) {
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
  const slug = sourceBookSlug(input.book);
  const [existing] = await getDb()
    .select({ coverKey: novels.coverKey })
    .from(novels)
    .where(eq(novels.slug, slug))
    .limit(1);
  try {
    coverKey = await ensureCover(input.book, existing?.coverKey ?? null, input.options);
    uploadedCover = Boolean(coverKey && coverKey !== existing?.coverKey);
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
    mongoGenreMap: input.mongoGenreMap,
    now: input.options.now,
  });
  const result = await importChapterChunk({
    novelId: novel.id,
    book: input.book,
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
  options: ImportOptions;
  startedAt: number;
  booksCollection: Collection<MongoBook>;
  chaptersCollection: Collection<MongoChapter>;
  orderCollection: Collection<MongoChapterOrder>;
  mongoGenreMap: Map<string, MongoTag>;
}) {
  const summary = createSummary(input.options, "backfill");
  let processedBooks = 0;
  while (processedBooks < input.options.bookLimit) {
    if (!hasRuntimeBudget(input.startedAt, input.options)) {
      summary.stoppedForRuntime = true;
      break;
    }

    const book = await loadNextBackfillBook(input.booksCollection, input.state);
    if (!book) {
      summary.backfillComplete = true;
      if (input.options.execute) {
        input.state.backfillCompletedAt = input.options.now.toISOString();
        delete input.state.currentBookId;
        delete input.state.chapterOffset;
        await saveCursorState(input.state, input.options.now);
      }
      break;
    }

    const offset = input.state.currentBookId === book.bookId ? input.state.chapterOffset ?? 0 : 0;
    const output = await processBookChunk({
      book,
      offset,
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

    if (input.options.execute) await saveCursorState(input.state, input.options.now);
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

function startIncrementalState(state: ImportCursorState, now: Date) {
  const previousCompleted = state.incremental?.lastSweepCompletedAt ?? state.backfillCompletedAt ?? now.toISOString();
  const lowerBound = new Date(new Date(previousCompleted).getTime() - INCREMENTAL_SAFETY_WINDOW_MS).toISOString();
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

    const book = await loadIncrementalBook(input.booksCollection, incremental, input.options.now);
    if (!book) {
      incremental.active = false;
      incremental.lastSweepCompletedAt = incremental.sweepUntil ?? input.options.now.toISOString();
      delete incremental.currentBookId;
      delete incremental.chapterOffset;
      delete incremental.afterBookId;
      delete incremental.afterUpdatedAt;
      if (input.options.execute) await saveCursorState(input.state, input.options.now);
      break;
    }

    const offset = incremental.currentBookId === book.bookId
      ? incremental.chapterOffset ?? 0
      : await existingChapterOffset(book);
    const output = await processBookChunk({
      book,
      offset,
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
      incremental.afterUpdatedAt = dateOrNow(book.lastChapterUpdatedAt, input.options.now).toISOString();
      incremental.afterBookId = book.bookId;
      delete incremental.currentBookId;
      delete incremental.chapterOffset;
    } else {
      summary.partialBooks += 1;
      summary.currentBookId = book.bookId;
      summary.currentChapterOffset = output.result.nextOffset;
      incremental.currentBookId = book.bookId;
      incremental.chapterOffset = output.result.nextOffset;
    }

    if (input.options.execute) await saveCursorState(input.state, input.options.now);
    if (!output.result.complete) break;
  }

  return summary;
}

function assertImageConfiguration(options: ImportOptions) {
  if (!options.execute || !options.uploadImages) return;
  requireR2Env();
}

export async function getTranslatedNovelImportStatus(now = new Date()) {
  loadLocalDotEnv();
  const state = await loadCursorState();
  const [postgresCounts] = await getDb()
    .select({
      novels: sql<number>`(select count(*)::int from ${novels})`.mapWith(Number),
      publishedNovels: sql<number>`(select count(*)::int from ${novels} where ${novels.publicationStatus} = 'PUBLISHED' and ${novels.deletedAt} is null)`.mapWith(Number),
      chapters: sql<number>`(select count(*)::int from ${chapters})`.mapWith(Number),
      paidChapters: sql<number>`(select count(*)::int from ${chapters} where ${chapters.isFree} = false)`.mapWith(Number),
      covers: sql<number>`(select count(*)::int from ${novels} where ${novels.coverKey} is not null and ${novels.deletedAt} is null)`.mapWith(Number),
    })
    .from(siteSettings)
    .limit(1);

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
    const client = new MongoClient(mongoEnv.MONGODB_URL, { serverSelectionTimeoutMS: 10_000 });
    await client.connect();
    try {
      const booksCollection = client.db(MONGO_DATABASE).collection<MongoBook>("books");
      const targetBooks = await booksCollection.countDocuments(TRANSLATED_NOVEL_QUERY);
      const backfillProcessedBooks = state.afterBookId
        ? await booksCollection.countDocuments({ ...TRANSLATED_NOVEL_QUERY, bookId: { $lte: state.afterBookId } })
        : 0;
      const nextBackfillBook = state.backfillCompletedAt
        ? null
        : await loadNextBackfillBook(booksCollection, state);
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
    },
    postgres: postgresCounts ?? { novels: 0, publishedNovels: 0, chapters: 0, paidChapters: 0, covers: 0 },
    mongo,
    lastRun: state.lastRun ?? null,
  };
}

export async function runTranslatedNovelImport(options = parseOptions()) {
  loadLocalDotEnv();
  const mongoEnv = requireMongoEnv();
  assertImageConfiguration(options);
  const startedAt = Date.now();
  const client = new MongoClient(mongoEnv.MONGODB_URL, { serverSelectionTimeoutMS: 15_000 });
  await client.connect();
  try {
    const mongoDb = client.db(MONGO_DATABASE);
    const booksCollection = mongoDb.collection<MongoBook>("books");
    const chaptersCollection = mongoDb.collection<MongoChapter>("chapters");
    const orderCollection = mongoDb.collection<MongoChapterOrder>("books-chapters-order");
    const mongoGenreMap = await loadMongoGenreMap(mongoDb.collection<MongoTag>("tags"));
    const state = await loadCursorState();

    let result: ReturnType<typeof createSummary>;
    if (options.mode === "backfill" || (options.mode === "auto" && !state.backfillCompletedAt)) {
      result = await runBackfill({
        state,
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
      await saveCursorState(state, options.now);
    }
    return result;
  } finally {
    await client.close();
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
