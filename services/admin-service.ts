import "server-only";

import { createHash } from "node:crypto";

import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  adminAuditLogs,
  authors,
  chapters,
  genres,
  mediaAssets,
  novelAlternativeTitles,
  novelAuthors,
  novelGenres,
  novelSearchDocuments,
  novelStatistics,
  novelTags,
  novels,
  promoBanners,
  reviews,
  tags,
  users,
} from "@/db/schema";
import { assertAdmin, type CurrentUser } from "@/lib/auth/dal";
import {
  invalidateBannerCache,
  invalidateChapterCache,
  invalidateNovelCache,
  invalidatePublishedReviewsCache,
  invalidateTaxonomyCache,
} from "@/lib/redis/invalidation";
import { createUniqueSlug, slugSchema } from "@/lib/validation/slug";
import { objectKeySchema } from "@/lib/validation/upload";

import { publishedReviewCountDelta } from "./user-domain";

const ADMIN_PAGE_SIZE = 25;
const CHAPTER_PAGE_SIZE = 30;
const REVIEW_PAGE_SIZE = 20;
const MAX_PAGE = 10_000;
const MAX_CHAPTER_CHARACTERS = 2_000_000;
const MAX_CHAPTER_UTF8_BYTES = 4_000_000;
const MAX_CHAPTER_PARAGRAPHS = 5_000;

const publicationStatusSchema = z.enum(["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const chapterStatusSchema = z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const storyStatusSchema = z.enum(["ONGOING", "COMPLETED", "HIATUS", "CANCELLED"]);
const contentRatingSchema = z.enum(["EVERYONE", "TEEN", "MATURE", "ADULT"]);
const reviewStatusSchema = z.enum(["PENDING", "PUBLISHED", "HIDDEN", "REJECTED"]);
const moderationStatusSchema = z.enum(["PUBLISHED", "HIDDEN", "REJECTED"]);

function nullableObjectKey(prefix: "covers/" | "banners/") {
  return z
    .union([objectKeySchema, z.literal(""), z.null()])
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || value.startsWith(prefix), `Object key must start with ${prefix}`);
}

const adminNovelBaseSchema = z
  .object({
    title: z.string().trim().min(2).max(300),
    titleOriginal: z.string().trim().max(300).optional().nullable().transform((value) => value || null),
    slug: slugSchema.optional(),
    synopsis: z.string().trim().min(20).max(50_000),
    authorNames: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
    genreIds: z.array(z.uuid()).min(1).max(8),
    tagNames: z.array(z.string().trim().min(1).max(160)).max(20).default([]),
    status: storyStatusSchema,
    publicationStatus: publicationStatusSchema,
    contentRating: contentRatingSchema,
    isFeatured: z.boolean().default(false),
    coverKey: nullableObjectKey("covers/"),
    bannerKey: nullableObjectKey("banners/"),
    scheduledFor: z.iso.datetime({ offset: true }).optional().nullable(),
  })
  .strict();

function validateNovelPublication(
  input: { publicationStatus: PublicationStatus; scheduledFor?: string | null },
  context: z.RefinementCtx,
) {
  if (input.publicationStatus === "SCHEDULED" && !input.scheduledFor) {
    context.addIssue({ code: "custom", path: ["scheduledFor"], message: "A scheduled novel needs a publication time" });
  }
  if (input.publicationStatus === "SCHEDULED") {
    context.addIssue({
      code: "custom",
      path: ["publicationStatus"],
      message: "Scheduled publishing is disabled until a production scheduler is configured",
    });
  }
  if (input.scheduledFor && new Date(input.scheduledFor).getTime() <= Date.now() && input.publicationStatus === "SCHEDULED") {
    context.addIssue({ code: "custom", path: ["scheduledFor"], message: "Scheduled publication must be in the future" });
  }
}

export const adminNovelInputSchema = adminNovelBaseSchema.superRefine(validateNovelPublication);
export const adminNovelUpdateSchema = adminNovelBaseSchema.omit({ slug: true }).superRefine(validateNovelPublication);

const decimalChapterNumber = z
  .number()
  .finite()
  .min(0)
  .max(99_999_999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
    "Chapter number supports at most two decimal places",
  );

const adminChapterBaseSchema = z
  .object({
    novelSlug: slugSchema,
    chapterNumber: decimalChapterNumber,
    sortOrder: z.number().int().positive().max(2_147_483_647),
    title: z.string().trim().min(1).max(500),
    content: z.string().max(MAX_CHAPTER_CHARACTERS),
    excerpt: z.string().trim().max(5_000).optional().nullable().transform((value) => value || null),
    status: chapterStatusSchema,
    isFree: z.boolean(),
    coinPrice: z.number().int().min(0).max(1_000_000),
    scheduledFor: z.iso.datetime({ offset: true }).optional().nullable(),
  })
  .strict();

function validateChapterPublication(
  input: {
    status: ChapterStatus;
    scheduledFor?: string | null;
    content: string;
    excerpt?: string | null;
    isFree: boolean;
    coinPrice: number;
  },
  context: z.RefinementCtx,
) {
  if (Buffer.byteLength(input.content, "utf8") > MAX_CHAPTER_UTF8_BYTES) {
    context.addIssue({
      code: "custom",
      path: ["content"],
      message: `Chapter content must not exceed ${MAX_CHAPTER_UTF8_BYTES} UTF-8 bytes`,
    });
  }

  // Bound the number of nodes created by public and preview renders. Stop as
  // soon as the limit is exceeded instead of splitting an adversarial body
  // into hundreds of thousands of strings during validation.
  const normalized = input.content.replace(/\r\n?/gu, "\n");
  let paragraphStart = 0;
  let paragraphCount = 0;
  for (let index = 0; index <= normalized.length; index += 1) {
    const atEnd = index === normalized.length;
    if (!atEnd && (normalized[index] !== "\n" || normalized[index + 1] !== "\n")) continue;

    if (normalized.slice(paragraphStart, index).trim()) paragraphCount += 1;
    if (paragraphCount > MAX_CHAPTER_PARAGRAPHS) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: `Chapter content must not exceed ${MAX_CHAPTER_PARAGRAPHS} paragraphs`,
      });
      break;
    }

    while (!atEnd && normalized[index + 1] === "\n") index += 1;
    paragraphStart = index + 1;
  }

  if (input.status === "PUBLISHED" && !input.content.trim()) {
    context.addIssue({ code: "custom", path: ["content"], message: "Published chapters cannot be empty" });
  }
  if (input.isFree && input.coinPrice !== 0) {
    context.addIssue({ code: "custom", path: ["coinPrice"], message: "Free chapters must have a price of 0" });
  }
  if (!input.isFree && input.coinPrice <= 0) {
    context.addIssue({ code: "custom", path: ["coinPrice"], message: "Paid chapters need a positive coin price" });
  }
  if (!input.isFree && input.status === "PUBLISHED" && !input.excerpt?.trim()) {
    context.addIssue({ code: "custom", path: ["excerpt"], message: "Paid chapters need a public preview excerpt" });
  }
  if (input.status === "SCHEDULED") {
    if (!input.scheduledFor) {
      context.addIssue({ code: "custom", path: ["scheduledFor"], message: "A scheduled chapter needs a publication time" });
    } else if (new Date(input.scheduledFor).getTime() <= Date.now()) {
      context.addIssue({ code: "custom", path: ["scheduledFor"], message: "Scheduled publication must be in the future" });
    }
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Scheduled publishing is disabled until a production scheduler is configured",
    });
  }
}

export const adminChapterInputSchema = adminChapterBaseSchema.superRefine(validateChapterPublication);
export const adminChapterUpdateSchema = adminChapterBaseSchema.omit({ novelSlug: true }).superRefine(validateChapterPublication);

export const adminReviewModerationSchema = z
  .object({
    status: moderationStatusSchema,
    note: z.string().trim().max(1_000).optional().nullable().transform((value) => value || null),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const nullableTrimmedText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .transform((value) => (value && value.length > 0 ? value : null));

export const adminGenreInputSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    thaiName: nullableTrimmedText(160),
    description: nullableTrimmedText(2_000),
    sortOrder: z.number().int().min(0).max(2_147_483_647),
    isActive: z.boolean(),
  })
  .strict();

export type AdminNovelInput = z.infer<typeof adminNovelInputSchema>;
export type AdminNovelUpdate = z.infer<typeof adminNovelUpdateSchema>;
export type AdminChapterInput = z.infer<typeof adminChapterInputSchema>;
export type AdminChapterUpdate = z.infer<typeof adminChapterUpdateSchema>;
export type PublicationStatus = z.infer<typeof publicationStatusSchema>;
export type ChapterStatus = z.infer<typeof chapterStatusSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type ReviewModerationInput = z.infer<typeof adminReviewModerationSchema>;
export type AdminGenreInput = z.infer<typeof adminGenreInputSchema>;

/** Same-origin path or absolute http(s) URL. Mirrors the promo_banners check
 * constraint so a rejected value fails validation before it reaches Postgres. */
const bannerLinkSchema = z
  .union([z.string().trim().max(2_000), z.null()])
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine(
    (value) => value === null || /^(?:\/(?!\/)|https?:\/\/)/u.test(value),
    "Link must be a path starting with / or an http(s) URL",
  );

export const adminBannerInputSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    subtitle: nullableTrimmedText(500),
    imageKey: z
      .string()
      .trim()
      .pipe(objectKeySchema)
      .refine((value) => value.startsWith("banners/"), "Object key must start with banners/"),
    linkUrl: bannerLinkSchema,
    ctaLabel: nullableTrimmedText(80),
    sortOrder: z.number().int().min(0).max(2_147_483_647),
    isActive: z.boolean(),
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .strict()
  .refine(
    (input) => !input.startsAt || !input.endsAt || new Date(input.startsAt) < new Date(input.endsAt),
    { path: ["endsAt"], message: "The end time must come after the start time" },
  );

export type AdminBannerInput = z.infer<typeof adminBannerInputSchema>;

export type AdminBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageKey: string;
  linkUrl: string | null;
  ctaLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminNovelQuery = {
  q?: string;
  status?: PublicationStatus | "all";
  genre?: string;
  sort?: "updated" | "views" | "chapters" | "title";
  page?: string | number;
};

export type AdminNovelRow = {
  id: string;
  slug: string;
  title: string;
  titleOriginal: string | null;
  authors: string[];
  genres: { id: string; slug: string; name: string }[];
  publicationStatus: PublicationStatus;
  status: z.infer<typeof storyStatusSchema>;
  isFeatured: boolean;
  coverKey: string | null;
  totalChapters: number;
  publishedChapters: number;
  viewCount: number;
  updatedAt: string;
};

export type AdminNovelDetail = AdminNovelRow & {
  synopsis: string;
  contentRating: z.infer<typeof contentRatingSchema>;
  bannerKey: string | null;
  tags: { id: string; slug: string; name: string }[];
  scheduledFor: string | null;
  publishedAt: string | null;
};

export type AdminChapterQuery = {
  q?: string;
  novel?: string;
  status?: ChapterStatus | "all";
  page?: string | number;
};

export type AdminChapterRow = {
  id: string;
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number;
  sortOrder: number;
  slug: string;
  title: string;
  status: ChapterStatus;
  wordCount: number;
  isFree: boolean;
  coinPrice: number;
  scheduledFor: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type AdminChapterDetail = AdminChapterRow & {
  content: string;
  excerpt: string | null;
};

export type AdminReviewQuery = {
  q?: string;
  status?: ReviewStatus | "all";
  page?: string | number;
};

export type AdminReviewRow = {
  id: string;
  novelId: string;
  novelSlug: string;
  novelTitle: string;
  authorName: string;
  authorEmail: string;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isSpoiler: boolean;
  likeCount: number;
  moderationNote: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReferenceData = {
  genres: { id: string; slug: string; name: string }[];
  tags: { id: string; slug: string; name: string }[];
};

export type AdminGenreRow = {
  id: string;
  slug: string;
  name: string;
  thaiName: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

function normalizePage(value: unknown) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1;
}

function cleanQuery(value: unknown, max = 100) {
  return typeof value === "string" ? value.replace(/\s+/gu, " ").trim().slice(0, max) : "";
}

function safeLike(value: string) {
  return `%${value.replace(/[%_\\]/gu, " ")}%`;
}

function toIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function asAuditValue(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

type ChapterAuditSource = {
  novelId: string;
  chapterNumber: number;
  sortOrder: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  wordCount: number;
  status: ChapterStatus;
  isFree: boolean;
  coinPrice: number;
  scheduledFor: Date | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

/** Audit chapter metadata without copying unpublished manuscripts into JSONB. */
export function chapterAuditSnapshot(chapter: ChapterAuditSource) {
  return {
    novelId: chapter.novelId,
    chapterNumber: chapter.chapterNumber,
    sortOrder: chapter.sortOrder,
    slug: chapter.slug,
    title: chapter.title,
    wordCount: chapter.wordCount,
    status: chapter.status,
    isFree: chapter.isFree,
    coinPrice: chapter.coinPrice,
    scheduledFor: toIso(chapter.scheduledFor),
    publishedAt: toIso(chapter.publishedAt),
    deletedAt: toIso(chapter.deletedAt),
    contentLength: chapter.content.length,
    contentSha256: createHash("sha256").update(chapter.content, "utf8").digest("hex"),
    excerptLength: chapter.excerpt?.length ?? 0,
  };
}

type ReviewAuditSource = {
  userId: string;
  novelId: string;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isSpoiler: boolean;
  likeCount: number;
  moderationNote: string | null;
  moderatedBy: string | null;
  moderatedAt: Date | null;
  deletedAt: Date | null;
};

/** Content-safe moderation audit: retain integrity metadata, never review text. */
export function reviewAuditSnapshot(review: ReviewAuditSource) {
  return {
    userId: review.userId,
    novelId: review.novelId,
    status: review.status,
    isSpoiler: review.isSpoiler,
    likeCount: review.likeCount,
    titleLength: review.title?.length ?? 0,
    bodyLength: review.body.length,
    bodySha256: createHash("sha256").update(review.body, "utf8").digest("hex"),
    moderationNoteLength: review.moderationNote?.length ?? 0,
    moderatedBy: review.moderatedBy,
    moderatedAt: toIso(review.moderatedAt),
    deletedAt: toIso(review.deletedAt),
  };
}

function genreAuditSnapshot(genre: {
  slug: string;
  name: string;
  thaiName: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    slug: genre.slug,
    name: genre.name,
    thaiName: genre.thaiName,
    descriptionLength: genre.description?.length ?? 0,
    sortOrder: genre.sortOrder,
    isActive: genre.isActive,
  };
}

async function revalidatePublicContent(
  kind: "novel" | "chapter",
  slug: string,
  includeTaxonomy = false,
) {
  const tagsToRevalidate = ["public-novels", "public-chapters", "public-search", "public-rankings", "public-sitemap"];
  if (includeTaxonomy) tagsToRevalidate.push("public-taxonomy");
  // Editorial mutations may remove previously public content. Expire now so an
  // unpublish/archive never serves a stale authorization/publication decision.
  for (const tag of tagsToRevalidate) revalidateTag(tag, { expire: 0 });
  if (kind === "novel") await invalidateNovelCache(slug, includeTaxonomy);
  else await invalidateChapterCache(slug);
}

async function writeAudit(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  actor: CurrentUser,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  await tx.insert(adminAuditLogs).values({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    before: asAuditValue(before),
    after: asAuditValue(after),
  });
}

async function hydrateNovelRows<TRow extends {
  id: string;
  slug: string;
  title: string;
  titleOriginal: string | null;
  publicationStatus: PublicationStatus;
  status: z.infer<typeof storyStatusSchema>;
  isFeatured: boolean;
  coverKey: string | null;
  totalChapters: number;
  publishedChapters: number;
  viewCount: number;
  updatedAt: Date;
}>(rows: TRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const db = getDb();
  const [authorRows, genreRows] = await Promise.all([
    db
      .select({ novelId: novelAuthors.novelId, name: authors.name })
      .from(novelAuthors)
      .innerJoin(authors, eq(authors.id, novelAuthors.authorId))
      .where(inArray(novelAuthors.novelId, ids))
      .orderBy(asc(novelAuthors.sortOrder), asc(authors.name)),
    db
      .select({ novelId: novelGenres.novelId, id: genres.id, slug: genres.slug, name: sql<string>`coalesce(${genres.thaiName}, ${genres.name})` })
      .from(novelGenres)
      .innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .where(inArray(novelGenres.novelId, ids))
      .orderBy(asc(novelGenres.sortOrder), asc(genres.name)),
  ]);
  const authorMap = new Map<string, string[]>();
  const genreMap = new Map<string, { id: string; slug: string; name: string }[]>();
  for (const row of authorRows) authorMap.set(row.novelId, [...(authorMap.get(row.novelId) ?? []), row.name]);
  for (const row of genreRows) {
    genreMap.set(row.novelId, [...(genreMap.get(row.novelId) ?? []), { id: row.id, slug: row.slug, name: row.name }]);
  }
  return rows.map((row): AdminNovelRow => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleOriginal: row.titleOriginal,
    authors: authorMap.get(row.id) ?? [],
    genres: genreMap.get(row.id) ?? [],
    publicationStatus: row.publicationStatus,
    status: row.status,
    isFeatured: row.isFeatured,
    coverKey: row.coverKey,
    totalChapters: row.totalChapters,
    publishedChapters: row.publishedChapters,
    viewCount: row.viewCount,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

const novelListSelection = {
  id: novels.id,
  slug: novels.slug,
  title: novels.title,
  titleOriginal: novels.titleOriginal,
  publicationStatus: novels.publicationStatus,
  status: novels.status,
  isFeatured: novels.isFeatured,
  coverKey: novels.coverKey,
  totalChapters: sql<number>`coalesce(${novelStatistics.totalChapters}, 0)`.mapWith(Number),
  publishedChapters: sql<number>`coalesce(${novelStatistics.publishedChapters}, 0)`.mapWith(Number),
  viewCount: sql<number>`coalesce(${novelStatistics.viewCount}, 0)`.mapWith(Number),
  updatedAt: novels.updatedAt,
};

export async function getAdminNovels(query: AdminNovelQuery = {}): Promise<AdminPage<AdminNovelRow>> {
  await assertAdmin();
  const page = normalizePage(query.page);
  const search = cleanQuery(query.q);
  const conditions: SQL[] = [isNull(novels.deletedAt)];
  if (query.status && query.status !== "all" && publicationStatusSchema.safeParse(query.status).success) {
    conditions.push(eq(novels.publicationStatus, query.status));
  }
  if (query.genre && query.genre !== "all") {
    conditions.push(
      exists(
        getDb()
          .select({ id: novelGenres.novelId })
          .from(novelGenres)
          .innerJoin(genres, eq(genres.id, novelGenres.genreId))
          .where(and(eq(novelGenres.novelId, novels.id), eq(genres.slug, cleanQuery(query.genre, 120)))),
      ),
    );
  }
  if (search) {
    const pattern = safeLike(search);
    conditions.push(
      or(
        ilike(novels.title, pattern),
        ilike(novels.titleOriginal, pattern),
        ilike(novels.slug, pattern),
        exists(
          getDb()
            .select({ id: novelAuthors.novelId })
            .from(novelAuthors)
            .innerJoin(authors, eq(authors.id, novelAuthors.authorId))
            .where(and(eq(novelAuthors.novelId, novels.id), ilike(authors.name, pattern))),
        ),
      )!,
    );
  }
  const where = and(...conditions)!;
  const sorting =
    query.sort === "views"
      ? [desc(sql`coalesce(${novelStatistics.viewCount}, 0)`), desc(novels.id)]
      : query.sort === "chapters"
        ? [desc(sql`coalesce(${novelStatistics.totalChapters}, 0)`), desc(novels.id)]
        : query.sort === "title"
          ? [asc(novels.title), asc(novels.id)]
          : [desc(novels.updatedAt), desc(novels.id)];
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db
      .select(novelListSelection)
      .from(novels)
      .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
      .where(where)
      .orderBy(...sorting)
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(novels).where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  return {
    items: await hydrateNovelRows(rows),
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total,
    totalPages,
  };
}

export async function getAdminNovel(slugInput: string): Promise<AdminNovelDetail | undefined> {
  await assertAdmin();
  const parsed = slugSchema.safeParse(slugInput);
  if (!parsed.success) return undefined;
  const rows = await getDb()
    .select({
      ...novelListSelection,
      synopsis: novels.synopsis,
      contentRating: novels.contentRating,
      bannerKey: novels.bannerKey,
      scheduledFor: novels.scheduledFor,
      publishedAt: novels.publishedAt,
    })
    .from(novels)
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .where(and(eq(novels.slug, parsed.data), isNull(novels.deletedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const [base] = await hydrateNovelRows([row]);
  const tagRows = await getDb()
    .select({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(novelTags)
    .innerJoin(tags, eq(tags.id, novelTags.tagId))
    .where(eq(novelTags.novelId, row.id))
    .orderBy(asc(tags.name));
  return {
    ...base,
    synopsis: row.synopsis,
    contentRating: row.contentRating,
    bannerKey: row.bannerKey,
    tags: tagRows,
    scheduledFor: toIso(row.scheduledFor),
    publishedAt: toIso(row.publishedAt),
  };
}

export async function getAdminReferenceData(): Promise<AdminReferenceData> {
  await assertAdmin();
  const [genreRows, tagRows] = await Promise.all([
    getDb()
      .select({ id: genres.id, slug: genres.slug, name: sql<string>`coalesce(${genres.thaiName}, ${genres.name})` })
      .from(genres)
      .where(eq(genres.isActive, true))
      .orderBy(asc(genres.sortOrder), asc(genres.name))
      .limit(500),
    getDb()
      .select({ id: tags.id, slug: tags.slug, name: tags.name })
      .from(tags)
      .where(eq(tags.isActive, true))
      .orderBy(desc(tags.usageCount), asc(tags.name))
      .limit(500),
  ]);
  return { genres: genreRows, tags: tagRows };
}

async function resolveGenreIds(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  genreIds: string[],
) {
  const unique = [...new Set(genreIds)];
  const rows = await tx.select({ id: genres.id }).from(genres).where(and(inArray(genres.id, unique), eq(genres.isActive, true)));
  if (rows.length !== unique.length) throw new AdminDataError("INVALID_GENRES", "One or more genres do not exist or are inactive", 400);
  return unique;
}

async function assertReadyMedia(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  coverKey: string | null,
  bannerKey: string | null,
  additionalKeys: Array<string | null> = [],
) {
  const expected = [
    ...(coverKey ? [{ key: coverKey, kind: "COVER" as const }] : []),
    ...(bannerKey ? [{ key: bannerKey, kind: "BANNER" as const }] : []),
  ];
  const keys = [...new Set([...expected.map((item) => item.key), ...additionalKeys.filter((key): key is string => Boolean(key))])];
  if (!keys.length) return;
  const rows = await tx
    .select({ objectKey: mediaAssets.objectKey, kind: mediaAssets.kind, status: mediaAssets.status })
    .from(mediaAssets)
    .where(and(inArray(mediaAssets.objectKey, keys), isNull(mediaAssets.deletedAt)))
    .orderBy(asc(mediaAssets.objectKey))
    .for("update");
  for (const item of expected) {
    const media = rows.find((row) => row.objectKey === item.key);
    if (!media || media.kind !== item.kind || media.status !== "READY") {
      throw new AdminDataError("MEDIA_NOT_READY", `${item.kind.toLowerCase()} upload is not verified`, 400);
    }
  }
}

async function orphanUnreferencedNovelMedia(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  keysInput: Array<string | null>,
  now: Date,
) {
  // Call only after assertReadyMedia has locked the combined old/new key set.
  // This keeps replacement attachment and cleanup lifecycle transitions in a
  // deterministic media-row order.
  const keys = [...new Set(keysInput.filter((key): key is string => Boolean(key)))];
  if (keys.length === 0) return;
  const [references, bannerReferences] = await Promise.all([
    tx
      .select({ coverKey: novels.coverKey, bannerKey: novels.bannerKey })
      .from(novels)
      .where(
        and(
          isNull(novels.deletedAt),
          or(inArray(novels.coverKey, keys), inArray(novels.bannerKey, keys)),
        ),
      ),
    // A promo banner may reuse an artwork key that a novel just released.
    tx.select({ imageKey: promoBanners.imageKey }).from(promoBanners).where(inArray(promoBanners.imageKey, keys)),
  ]);
  const referenced = new Set([
    ...references.flatMap((row) => [row.coverKey, row.bannerKey].filter((key): key is string => Boolean(key))),
    ...bannerReferences.map((row) => row.imageKey),
  ]);
  const orphaned = keys.filter((key) => !referenced.has(key));
  if (orphaned.length === 0) return;
  await tx
    .update(mediaAssets)
    .set({ status: "ORPHANED", updatedAt: now })
    .where(and(inArray(mediaAssets.objectKey, orphaned), eq(mediaAssets.status, "READY"), isNull(mediaAssets.deletedAt)));
}

async function resolveAuthors(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  names: string[],
) {
  const uniqueNames = [...new Set(names.map((name) => name.replace(/\s+/gu, " ").trim()).filter(Boolean))];
  const resolved: { id: string; name: string }[] = [];
  for (const name of uniqueNames) {
    const [existing] = await tx.select({ id: authors.id, name: authors.name }).from(authors).where(sql`lower(${authors.name}) = lower(${name})`).limit(1);
    if (existing) {
      resolved.push(existing);
      continue;
    }
    const slug = await createUniqueSlug(
      name,
      async (candidate) => Boolean((await tx.select({ id: authors.id }).from(authors).where(eq(authors.slug, candidate)).limit(1))[0]),
      "author",
    );
    const [created] = await tx.insert(authors).values({ name, slug }).returning({ id: authors.id, name: authors.name });
    resolved.push(created);
  }
  return resolved;
}

async function resolveTags(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  names: string[],
) {
  const uniqueNames = [...new Set(names.map((name) => name.replace(/\s+/gu, " ").trim()).filter(Boolean))];
  const resolved: { id: string; name: string }[] = [];
  for (const name of uniqueNames) {
    const [existing] = await tx
      .select({ id: tags.id, name: tags.name, isActive: tags.isActive })
      .from(tags)
      .where(sql`lower(${tags.name}) = lower(${name})`)
      .limit(1);
    if (existing) {
      if (!existing.isActive) {
        const [reactivated] = await tx
          .update(tags)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(tags.id, existing.id))
          .returning({ id: tags.id, name: tags.name });
        resolved.push(reactivated);
      } else {
        resolved.push({ id: existing.id, name: existing.name });
      }
      continue;
    }
    const slug = await createUniqueSlug(
      name,
      async (candidate) => Boolean((await tx.select({ id: tags.id }).from(tags).where(eq(tags.slug, candidate)).limit(1))[0]),
      "tag",
    );
    const [created] = await tx.insert(tags).values({ name, slug }).returning({ id: tags.id, name: tags.name });
    resolved.push(created);
  }
  return resolved;
}

async function refreshTagCounts(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  tagIds: string[],
) {
  const unique = [...new Set(tagIds)];
  for (const tagId of unique) {
    await tx
      .update(tags)
      .set({
        usageCount: sql<number>`(select count(*)::int from ${novelTags} where ${novelTags.tagId} = ${tagId})`,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, tagId));
  }
}

async function replaceNovelRelations(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  novelId: string,
  input: Pick<AdminNovelInput, "authorNames" | "genreIds" | "tagNames">,
) {
  const oldTagRows = await tx.select({ id: novelTags.tagId }).from(novelTags).where(eq(novelTags.novelId, novelId));
  const genreIds = await resolveGenreIds(tx, input.genreIds);
  const authorRows = await resolveAuthors(tx, input.authorNames);
  const tagRows = await resolveTags(tx, input.tagNames);
  await tx.delete(novelAuthors).where(eq(novelAuthors.novelId, novelId));
  await tx.delete(novelGenres).where(eq(novelGenres.novelId, novelId));
  await tx.delete(novelTags).where(eq(novelTags.novelId, novelId));
  await tx.insert(novelAuthors).values(
    authorRows.map((author, index) => ({ novelId, authorId: author.id, role: "AUTHOR" as const, sortOrder: index + 1 })),
  );
  await tx.insert(novelGenres).values(
    genreIds.map((genreId, index) => ({ novelId, genreId, isPrimary: index === 0, sortOrder: index + 1 })),
  );
  if (tagRows.length) await tx.insert(novelTags).values(tagRows.map((tag) => ({ novelId, tagId: tag.id })));
  await refreshTagCounts(tx, [...oldTagRows.map((row) => row.id), ...tagRows.map((row) => row.id)]);
  return { authorRows, tagRows };
}

async function updateSearchDocument(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  novelId: string,
  title: string,
  titleOriginal: string | null,
  authorsForNovel: { name: string }[],
  tagsForNovel: { name: string }[],
) {
  const [genreRows, alternativeTitleRows] = await Promise.all([
    tx
      .select({ name: genres.name, thaiName: genres.thaiName })
      .from(novelGenres)
      .innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .where(eq(novelGenres.novelId, novelId)),
    tx
      .select({ title: novelAlternativeTitles.title })
      .from(novelAlternativeTitles)
      .where(eq(novelAlternativeTitles.novelId, novelId)),
  ]);
  const searchText = [
    title,
    titleOriginal,
    ...alternativeTitleRows.map((row) => row.title),
    ...authorsForNovel.map((author) => author.name),
    ...genreRows.flatMap((genre) => [genre.name, genre.thaiName]),
    ...tagsForNovel.map((tag) => tag.name),
  ]
    .filter(Boolean)
    .join(" ");
  await tx
    .insert(novelSearchDocuments)
    .values({ novelId, searchText })
    .onConflictDoUpdate({ target: novelSearchDocuments.novelId, set: { searchText, updatedAt: new Date() } });
}

export class AdminDataError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AdminDataError";
  }
}

/** Optimistic moderation boundary: approval is only valid for reviewed bytes. */
export function assertReviewRevision(expectedUpdatedAt: string, currentUpdatedAt: Date) {
  const expected = new Date(expectedUpdatedAt);
  if (!Number.isFinite(expected.getTime()) || expected.getTime() !== currentUpdatedAt.getTime()) {
    throw new AdminDataError(
      "REVIEW_REVISION_CONFLICT",
      "Review changed after this moderation queue was loaded. Review the latest revision before acting.",
      409,
    );
  }
}

export async function createAdminNovel(inputValue: unknown) {
  const actor = await assertAdmin();
  const input = adminNovelInputSchema.parse(inputValue);
  const now = new Date();
  const result = await getDb().transaction(async (tx) => {
    await assertReadyMedia(tx, input.coverKey, input.bannerKey);
    const proposed = input.slug ?? input.title;
    const slug = await createUniqueSlug(
      proposed,
      async (candidate) => Boolean((await tx.select({ id: novels.id }).from(novels).where(eq(novels.slug, candidate)).limit(1))[0]),
      "novel",
    );
    const [created] = await tx
      .insert(novels)
      .values({
        slug,
        title: input.title,
        titleOriginal: input.titleOriginal,
        synopsis: input.synopsis,
        coverKey: input.coverKey,
        bannerKey: input.bannerKey,
        status: input.status,
        publicationStatus: input.publicationStatus,
        contentRating: input.contentRating,
        isFeatured: input.isFeatured,
        scheduledFor: input.publicationStatus === "SCHEDULED" ? new Date(input.scheduledFor!) : null,
        publishedAt: input.publicationStatus === "PUBLISHED" ? now : null,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning();
    await tx.insert(novelStatistics).values({ novelId: created.id });
    const relations = await replaceNovelRelations(tx, created.id, input);
    await updateSearchDocument(tx, created.id, input.title, input.titleOriginal, relations.authorRows, relations.tagRows);
    await writeAudit(tx, actor, "novel.create", "novel", created.id, null, created);
    return { id: created.id, slug: created.slug };
  });
  await revalidatePublicContent("novel", result.slug, true);
  return result;
}

export async function updateAdminNovel(slugInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const slug = slugSchema.parse(slugInput);
  const input = adminNovelUpdateSchema.parse(inputValue);
  const now = new Date();
  const result = await getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(novels)
      .where(and(eq(novels.slug, slug), isNull(novels.deletedAt)))
      .for("no key update")
      .limit(1);
    if (!before) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
    await assertReadyMedia(tx, input.coverKey, input.bannerKey, [before.coverKey, before.bannerKey]);
    const [updated] = await tx
      .update(novels)
      .set({
        title: input.title,
        titleOriginal: input.titleOriginal,
        synopsis: input.synopsis,
        coverKey: input.coverKey,
        bannerKey: input.bannerKey,
        status: input.status,
        publicationStatus: input.publicationStatus,
        contentRating: input.contentRating,
        isFeatured: input.isFeatured,
        scheduledFor: input.publicationStatus === "SCHEDULED" ? new Date(input.scheduledFor!) : null,
        publishedAt: input.publicationStatus === "PUBLISHED" ? before.publishedAt ?? now : before.publishedAt,
        updatedBy: actor.id,
        updatedAt: now,
      })
      .where(eq(novels.id, before.id))
      .returning();
    const relations = await replaceNovelRelations(tx, before.id, input);
    await updateSearchDocument(tx, before.id, input.title, input.titleOriginal, relations.authorRows, relations.tagRows);
    await orphanUnreferencedNovelMedia(tx, [before.coverKey, before.bannerKey], now);
    await writeAudit(tx, actor, "novel.update", "novel", before.id, before, updated);
    return { id: updated.id, slug: updated.slug };
  });
  await revalidatePublicContent("novel", result.slug, true);
  return result;
}

export async function deleteAdminNovel(slugInput: string) {
  const actor = await assertAdmin();
  if (actor.role !== "ADMIN") throw new AdminDataError("ADMIN_REQUIRED", "Only administrators can delete novels", 403);
  const slug = slugSchema.parse(slugInput);
  const result = await getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(novels)
      .where(and(eq(novels.slug, slug), isNull(novels.deletedAt)))
      .for("no key update")
      .limit(1);
    if (!before) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
    const now = new Date();
    await assertReadyMedia(tx, null, null, [before.coverKey, before.bannerKey]);
    const [updated] = await tx
      .update(novels)
      .set({ publicationStatus: "ARCHIVED", deletedAt: now, updatedBy: actor.id, updatedAt: now })
      .where(eq(novels.id, before.id))
      .returning();
    await orphanUnreferencedNovelMedia(tx, [before.coverKey, before.bannerKey], now);
    await writeAudit(tx, actor, "novel.delete", "novel", before.id, before, updated);
    return { id: before.id, slug: before.slug };
  });
  await revalidatePublicContent("novel", result.slug, true);
  return result;
}

const chapterSelection = {
  id: chapters.id,
  novelSlug: novels.slug,
  novelTitle: novels.title,
  chapterNumber: chapters.chapterNumber,
  sortOrder: chapters.sortOrder,
  slug: chapters.slug,
  title: chapters.title,
  status: chapters.status,
  wordCount: chapters.wordCount,
  isFree: chapters.isFree,
  coinPrice: chapters.coinPrice,
  scheduledFor: chapters.scheduledFor,
  publishedAt: chapters.publishedAt,
  updatedAt: chapters.updatedAt,
};

type ChapterSelectionRow = {
  id: string; novelSlug: string; novelTitle: string; chapterNumber: number; sortOrder: number; slug: string; title: string;
  status: ChapterStatus; wordCount: number; isFree: boolean; coinPrice: number; scheduledFor: Date | null; publishedAt: Date | null; updatedAt: Date;
};

function mapChapter(row: ChapterSelectionRow): AdminChapterRow {
  return {
    ...row,
    scheduledFor: toIso(row.scheduledFor),
    publishedAt: toIso(row.publishedAt),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminChapters(query: AdminChapterQuery = {}): Promise<AdminPage<AdminChapterRow>> {
  await assertAdmin();
  const page = normalizePage(query.page);
  const search = cleanQuery(query.q);
  const conditions: SQL[] = [isNull(chapters.deletedAt), isNull(novels.deletedAt)];
  if (query.novel && query.novel !== "all") conditions.push(eq(novels.slug, cleanQuery(query.novel, 180)));
  if (query.status && query.status !== "all" && chapterStatusSchema.safeParse(query.status).success) {
    conditions.push(eq(chapters.status, query.status));
  }
  if (search) {
    const numeric = Number(search);
    conditions.push(
      or(
        ilike(chapters.title, safeLike(search)),
        ilike(novels.title, safeLike(search)),
        Number.isFinite(numeric) ? eq(chapters.chapterNumber, numeric) : undefined,
      )!,
    );
  }
  const where = and(...conditions)!;
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db
      .select(chapterSelection)
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(where)
      .orderBy(desc(chapters.updatedAt), desc(chapters.id))
      .limit(CHAPTER_PAGE_SIZE)
      .offset((page - 1) * CHAPTER_PAGE_SIZE),
    db.select({ value: count() }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId)).where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);
  return { items: rows.map(mapChapter), page, pageSize: CHAPTER_PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / CHAPTER_PAGE_SIZE)) };
}

export async function getAdminChapter(novelSlugInput: string, numberInput: string | number): Promise<AdminChapterDetail | undefined> {
  await assertAdmin();
  const novelSlug = slugSchema.safeParse(novelSlugInput);
  const chapterNumber = Number(numberInput);
  if (!novelSlug.success || !decimalChapterNumber.safeParse(chapterNumber).success) return undefined;
  const rows = await getDb()
    .select({ ...chapterSelection, content: chapters.content, excerpt: chapters.excerpt })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(novels.slug, novelSlug.data), eq(chapters.chapterNumber, chapterNumber), isNull(chapters.deletedAt), isNull(novels.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? { ...mapChapter(row), content: row.content, excerpt: row.excerpt } : undefined;
}

export async function getAdminChapterById(idInput: string): Promise<AdminChapterDetail | undefined> {
  await assertAdmin();
  const id = z.uuid().safeParse(idInput);
  if (!id.success) return undefined;
  const rows = await getDb()
    .select({ ...chapterSelection, content: chapters.content, excerpt: chapters.excerpt })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, id.data), isNull(chapters.deletedAt), isNull(novels.deletedAt)))
    .limit(1);
  const row = rows[0];
  return row ? { ...mapChapter(row), content: row.content, excerpt: row.excerpt } : undefined;
}

export async function getNextChapterDefaults(novelSlugInput: string) {
  await assertAdmin();
  const novelSlug = slugSchema.parse(novelSlugInput);
  const [row] = await getDb()
    .select({
      chapterNumber: sql<number>`coalesce(max(${chapters.chapterNumber}), 0)`.mapWith(Number),
      sortOrder: sql<number>`coalesce(max(${chapters.sortOrder}), 0)`.mapWith(Number),
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    // Unique indexes include soft-deleted rows, so their numbers/orders must
    // remain reserved when suggesting the next values.
    .where(and(eq(novels.slug, novelSlug), isNull(novels.deletedAt)));
  return { chapterNumber: Number(row?.chapterNumber ?? 0) + 1, sortOrder: Number(row?.sortOrder ?? 0) + 1 };
}

function countWords(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  try {
    return [...new Intl.Segmenter("th", { granularity: "word" }).segment(trimmed)].filter((item) => item.isWordLike).length;
  } catch {
    return trimmed.split(/\s+/u).length;
  }
}

async function syncNovelStatistics(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  novelId: string,
) {
  // Serialize chapter mutations per novel. Without this lock, two editors can
  // each commit aggregates calculated from different snapshots.
  const [lockedNovel] = await tx
    .select({ id: novels.id })
    .from(novels)
    .where(eq(novels.id, novelId))
    .for("no key update")
    .limit(1);
  if (!lockedNovel) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
  const [counts] = await tx
    .select({
      total: sql<number>`count(*) filter (where ${chapters.deletedAt} is null)::int`.mapWith(Number),
      published: sql<number>`count(*) filter (where ${chapters.deletedAt} is null and ${chapters.status} = 'PUBLISHED')::int`.mapWith(Number),
    })
    .from(chapters)
    .where(eq(chapters.novelId, novelId));
  const [latest] = await tx
    .select({ id: chapters.id, publishedAt: chapters.publishedAt })
    .from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt)))
    .orderBy(desc(chapters.sortOrder), desc(chapters.id))
    .limit(1);
  const values = {
    latestChapterId: latest?.id ?? null,
    totalChapters: Number(counts?.total ?? 0),
    publishedChapters: Number(counts?.published ?? 0),
    latestChapterAt: latest?.publishedAt ?? null,
    updatedAt: new Date(),
  };
  await tx
    .insert(novelStatistics)
    .values({ novelId, ...values })
    .onConflictDoUpdate({ target: novelStatistics.novelId, set: values });
  await tx.update(novels).set({ latestChapterAt: values.latestChapterAt, updatedAt: new Date() }).where(eq(novels.id, novelId));
}

function chapterDates(status: ChapterStatus, existingPublishedAt: Date | null = null, scheduledFor?: string | null) {
  return {
    scheduledFor: status === "SCHEDULED" ? new Date(scheduledFor!) : null,
    publishedAt: status === "PUBLISHED" ? existingPublishedAt ?? new Date() : existingPublishedAt,
  };
}

export async function createAdminChapter(inputValue: unknown) {
  const actor = await assertAdmin();
  const input = adminChapterInputSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const [novel] = await tx
      .select({ id: novels.id, slug: novels.slug })
      .from(novels)
      .where(and(eq(novels.slug, input.novelSlug), isNull(novels.deletedAt)))
      .for("no key update")
      .limit(1);
    if (!novel) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
    const slug = await createUniqueSlug(
      `chapter-${String(input.chapterNumber).replace(".", "-")}-${input.title}`,
      async (candidate) => Boolean((await tx.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.novelId, novel.id), eq(chapters.slug, candidate))).limit(1))[0]),
      "chapter",
    );
    const dates = chapterDates(input.status, null, input.scheduledFor);
    const [created] = await tx
      .insert(chapters)
      .values({
        novelId: novel.id,
        chapterNumber: input.chapterNumber,
        sortOrder: input.sortOrder,
        slug,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        wordCount: countWords(input.content),
        status: input.status,
        isFree: input.isFree,
        coinPrice: input.coinPrice,
        ...dates,
        createdBy: actor.id,
        updatedBy: actor.id,
      })
      .returning();
    await syncNovelStatistics(tx, novel.id);
    await writeAudit(
      tx,
      actor,
      `chapter.${input.status === "PUBLISHED" ? "publish" : "create"}`,
      "chapter",
      created.id,
      null,
      chapterAuditSnapshot(created),
    );
    return { id: created.id, novelSlug: novel.slug, chapterNumber: created.chapterNumber };
  });
  await revalidatePublicContent("chapter", result.novelSlug);
  return result;
}

export async function updateAdminChapter(idInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const input = adminChapterUpdateSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const [located] = await tx
      .select({ novelId: chapters.novelId })
      .from(chapters)
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .limit(1);
    if (!located) throw new AdminDataError("CHAPTER_NOT_FOUND", "Chapter not found", 404);
    await tx.select({ id: novels.id }).from(novels).where(eq(novels.id, located.novelId)).for("no key update").limit(1);
    const [before] = await tx
      .select()
      .from(chapters)
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .for("update")
      .limit(1);
    if (!before) throw new AdminDataError("CHAPTER_NOT_FOUND", "Chapter not found", 404);
    const [novel] = await tx.select({ slug: novels.slug }).from(novels).where(and(eq(novels.id, before.novelId), isNull(novels.deletedAt))).limit(1);
    if (!novel) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
    const dates = chapterDates(input.status, before.publishedAt, input.scheduledFor);
    const [updated] = await tx
      .update(chapters)
      .set({
        chapterNumber: input.chapterNumber,
        sortOrder: input.sortOrder,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        wordCount: countWords(input.content),
        status: input.status,
        isFree: input.isFree,
        coinPrice: input.coinPrice,
        ...dates,
        updatedBy: actor.id,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, before.id))
      .returning();
    await syncNovelStatistics(tx, before.novelId);
    const action = before.status !== "PUBLISHED" && input.status === "PUBLISHED"
      ? "chapter.publish"
      : before.status === "PUBLISHED" && input.status !== "PUBLISHED"
        ? "chapter.unpublish"
        : input.status === "SCHEDULED"
          ? "chapter.schedule"
          : "chapter.update";
    await writeAudit(
      tx,
      actor,
      action,
      "chapter",
      before.id,
      chapterAuditSnapshot(before),
      chapterAuditSnapshot(updated),
    );
    return { id: before.id, novelSlug: novel.slug, chapterNumber: updated.chapterNumber };
  });
  await revalidatePublicContent("chapter", result.novelSlug);
  return result;
}

export async function deleteAdminChapter(idInput: string) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const result = await getDb().transaction(async (tx) => {
    const [located] = await tx
      .select({ novelId: chapters.novelId })
      .from(chapters)
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .limit(1);
    if (!located) throw new AdminDataError("CHAPTER_NOT_FOUND", "Chapter not found", 404);
    const [novel] = await tx
      .select({ id: novels.id, slug: novels.slug })
      .from(novels)
      .where(eq(novels.id, located.novelId))
      .for("no key update")
      .limit(1);
    if (!novel) throw new AdminDataError("NOVEL_NOT_FOUND", "Novel not found", 404);
    const [before] = await tx
      .select()
      .from(chapters)
      .where(and(eq(chapters.id, id), isNull(chapters.deletedAt)))
      .for("update")
      .limit(1);
    if (!before) throw new AdminDataError("CHAPTER_NOT_FOUND", "Chapter not found", 404);
    const now = new Date();
    const [updated] = await tx
      .update(chapters)
      .set({ status: "ARCHIVED", deletedAt: now, updatedBy: actor.id, updatedAt: now })
      .where(eq(chapters.id, before.id))
      .returning();
    await syncNovelStatistics(tx, before.novelId);
    await writeAudit(
      tx,
      actor,
      "chapter.delete",
      "chapter",
      before.id,
      chapterAuditSnapshot(before),
      chapterAuditSnapshot(updated),
    );
    return { id: before.id, novelSlug: novel.slug };
  });
  await revalidatePublicContent("chapter", result.novelSlug);
  return result;
}

export async function getAdminReviews(query: AdminReviewQuery = {}): Promise<AdminPage<AdminReviewRow>> {
  await assertAdmin();
  const page = normalizePage(query.page);
  const search = cleanQuery(query.q);
  const conditions: SQL[] = [isNull(reviews.deletedAt)];
  if (query.status && query.status !== "all" && reviewStatusSchema.safeParse(query.status).success) {
    conditions.push(eq(reviews.status, query.status));
  }
  if (search) {
    const pattern = safeLike(search);
    conditions.push(
      or(
        ilike(novels.title, pattern),
        ilike(novels.slug, pattern),
        ilike(users.name, pattern),
        ilike(users.email, pattern),
        ilike(reviews.title, pattern),
      )!,
    );
  }
  const where = and(...conditions)!;
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db
      .select({
        id: reviews.id,
        novelId: reviews.novelId,
        novelSlug: novels.slug,
        novelTitle: novels.title,
        authorName: users.name,
        authorEmail: users.email,
        title: reviews.title,
        body: reviews.body,
        status: reviews.status,
        isSpoiler: reviews.isSpoiler,
        likeCount: reviews.likeCount,
        moderationNote: reviews.moderationNote,
        moderatedBy: reviews.moderatedBy,
        moderatedAt: reviews.moderatedAt,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(novels, eq(novels.id, reviews.novelId))
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(where)
      .orderBy(sql`case when ${reviews.status} = 'PENDING' then 0 else 1 end`, asc(reviews.createdAt), asc(reviews.id))
      .limit(REVIEW_PAGE_SIZE)
      .offset((page - 1) * REVIEW_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(reviews)
      .innerJoin(novels, eq(novels.id, reviews.novelId))
      .innerJoin(users, eq(users.id, reviews.userId))
      .where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);
  return {
    items: rows.map((row) => ({
      ...row,
      authorName: row.authorName || "ไม่ระบุชื่อ",
      moderatedAt: toIso(row.moderatedAt),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    page,
    pageSize: REVIEW_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE)),
  };
}

export async function moderateAdminReview(idInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const input = adminReviewModerationSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const [located] = await tx
      .select({ novelId: reviews.novelId, novelSlug: novels.slug })
      .from(reviews)
      .innerJoin(novels, eq(novels.id, reviews.novelId))
      .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)))
      .limit(1);
    if (!located) throw new AdminDataError("REVIEW_NOT_FOUND", "Review not found or was removed by its author", 404);

    await tx.insert(novelStatistics).values({ novelId: located.novelId }).onConflictDoNothing();
    // Match the reader write lock order so resubmission and moderation cannot
    // leave reviewCount or moderation state calculated from stale data.
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${located.novelId} for update`);
    const [before] = await tx
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), isNull(reviews.deletedAt)))
      .for("update")
      .limit(1);
    if (!before) throw new AdminDataError("REVIEW_NOT_FOUND", "Review not found or was removed by its author", 404);
    assertReviewRevision(input.expectedUpdatedAt, before.updatedAt);

    const now = new Date();
    const [updated] = await tx
      .update(reviews)
      .set({
        status: input.status,
        moderationNote: input.note,
        moderatedBy: actor.id,
        moderatedAt: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, before.id))
      .returning();
    const reviewDelta = publishedReviewCountDelta(before, updated);
    if (reviewDelta !== 0) {
      await tx
        .update(novelStatistics)
        .set({
          reviewCount: sql`greatest(${novelStatistics.reviewCount} + ${reviewDelta}, 0)`,
          updatedAt: now,
        })
        .where(eq(novelStatistics.novelId, located.novelId));
    }
    await writeAudit(
      tx,
      actor,
      `review.${input.status.toLowerCase()}`,
      "review",
      before.id,
      reviewAuditSnapshot(before),
      reviewAuditSnapshot(updated),
    );
    return { id: updated.id, status: updated.status, novelId: updated.novelId, novelSlug: located.novelSlug };
  });
  revalidateTag("public-reviews", { expire: 0 });
  revalidateTag("public-novels", { expire: 0 });
  await invalidatePublishedReviewsCache(result.novelSlug);
  return result;
}

export async function getPendingWork() {
  await assertAdmin();
  const [drafts, scheduled, pendingReviews] = await Promise.all([
    getDb().select({ value: count() }).from(chapters).where(and(eq(chapters.status, "DRAFT"), isNull(chapters.deletedAt))),
    getDb().select({ value: count() }).from(chapters).where(and(eq(chapters.status, "SCHEDULED"), isNull(chapters.deletedAt))),
    getDb().select({ value: count() }).from(reviews).where(and(eq(reviews.status, "PENDING"), isNull(reviews.deletedAt))),
  ]);
  return {
    submissions: 0,
    reports: 0,
    comments: Number(pendingReviews[0]?.value ?? 0),
    payouts: 0,
    drafts: Number(drafts[0]?.value ?? 0),
    scheduled: Number(scheduled[0]?.value ?? 0),
  };
}

export async function getDashboard() {
  await assertAdmin();
  const db = getDb();
  const [novelCount, publishedNovelCount, chapterCount, publishedChapterCount, userCount, recentActivity] = await Promise.all([
    db.select({ value: count() }).from(novels).where(isNull(novels.deletedAt)),
    db.select({ value: count() }).from(novels).where(and(eq(novels.publicationStatus, "PUBLISHED"), isNull(novels.deletedAt))),
    db.select({ value: count() }).from(chapters).where(isNull(chapters.deletedAt)),
    db.select({ value: count() }).from(chapters).where(and(eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt))),
    db.select({ value: count() }).from(users).where(and(eq(users.status, "ACTIVE"), isNull(users.deletedAt))),
    getRecentActivity(10),
  ]);
  return {
    counts: {
      novels: Number(novelCount[0]?.value ?? 0),
      publishedNovels: Number(publishedNovelCount[0]?.value ?? 0),
      chapters: Number(chapterCount[0]?.value ?? 0),
      publishedChapters: Number(publishedChapterCount[0]?.value ?? 0),
      activeUsers: Number(userCount[0]?.value ?? 0),
    },
    recentActivity,
  };
}

export async function getRecentActivity(limitInput = 25) {
  await assertAdmin();
  const limit = Math.min(Math.max(Number.isSafeInteger(limitInput) ? limitInput : 25, 1), 100);
  const rows = await getDb()
    .select({
      id: adminAuditLogs.id,
      actorName: users.name,
      actorEmail: users.email,
      action: adminAuditLogs.action,
      entityType: adminAuditLogs.entityType,
      entityId: adminAuditLogs.entityId,
      createdAt: adminAuditLogs.createdAt,
    })
    .from(adminAuditLogs)
    .leftJoin(users, eq(users.id, adminAuditLogs.actorId))
    .orderBy(desc(adminAuditLogs.createdAt), desc(adminAuditLogs.id))
    .limit(limit);
  return rows.map((row) => ({ ...row, actor: row.actorName || row.actorEmail || "System", createdAt: row.createdAt.toISOString() }));
}

async function revalidateGenreContent() {
  for (const tag of ["public-taxonomy", "public-search", "public-sitemap", "public-novels"]) {
    revalidateTag(tag, { expire: 0 });
  }
  await invalidateTaxonomyCache();
}

export async function createAdminGenre(inputValue: unknown) {
  const actor = await assertAdmin();
  const input = adminGenreInputSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const slug = await createUniqueSlug(
      input.name,
      async (candidate) => Boolean((await tx.select({ id: genres.id }).from(genres).where(eq(genres.slug, candidate)).limit(1))[0]),
      "genre",
    );
    const [created] = await tx
      .insert(genres)
      .values({ slug, ...input })
      .returning();
    await writeAudit(tx, actor, "genre.create", "genre", created.id, null, genreAuditSnapshot(created));
    return { ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() };
  });
  await revalidateGenreContent();
  return result;
}

export async function updateAdminGenre(idInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const input = adminGenreInputSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(genres)
      .where(eq(genres.id, id))
      .for("update")
      .limit(1);
    if (!before) throw new AdminDataError("GENRE_NOT_FOUND", "Genre not found", 404);
    const [updated] = await tx
      .update(genres)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(genres.id, id))
      .returning();
    const action = before.isActive && !updated.isActive
      ? "genre.deactivate"
      : !before.isActive && updated.isActive
        ? "genre.reactivate"
        : "genre.update";
    await writeAudit(
      tx,
      actor,
      action,
      "genre",
      updated.id,
      genreAuditSnapshot(before),
      genreAuditSnapshot(updated),
    );
    return { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
  });
  await revalidateGenreContent();
  return result;
}

export async function getAdminTaxonomy() {
  await assertAdmin();
  const [genreRows, tagRows, authorRows] = await Promise.all([
    getDb()
      .select({
        id: genres.id,
        slug: genres.slug,
        name: genres.name,
        thaiName: genres.thaiName,
        description: genres.description,
        sortOrder: genres.sortOrder,
        isActive: genres.isActive,
        usageCount: sql<number>`(select count(*)::int from ${novelGenres} where ${novelGenres.genreId} = ${genres.id})`.mapWith(Number),
        createdAt: genres.createdAt,
        updatedAt: genres.updatedAt,
      })
      .from(genres)
      .orderBy(asc(genres.sortOrder), asc(genres.name))
      .limit(500),
    getDb().select().from(tags).orderBy(desc(tags.usageCount), asc(tags.name)).limit(500),
    getDb().select().from(authors).orderBy(asc(authors.name)).limit(500),
  ]);
  return {
    genres: genreRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    tags: tagRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    authors: authorRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
  };
}

/* ---------------------------------------------------------------------------
   Promo banners — editorial artwork for the public home page
   --------------------------------------------------------------------------- */

async function revalidateBannerContent() {
  revalidateTag("public-banners", { expire: 0 });
  await invalidateBannerCache();
}

function serializeBanner(row: typeof promoBanners.$inferSelect): AdminBannerRow {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageKey: row.imageKey,
    linkUrl: row.linkUrl,
    ctaLabel: row.ctaLabel,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function bannerValues(input: AdminBannerInput) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    imageKey: input.imageKey,
    linkUrl: input.linkUrl,
    ctaLabel: input.ctaLabel,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
}

export async function getAdminBanners(): Promise<AdminBannerRow[]> {
  await assertAdmin();
  const rows = await getDb()
    .select()
    .from(promoBanners)
    .orderBy(asc(promoBanners.sortOrder), desc(promoBanners.createdAt))
    .limit(200);
  return rows.map(serializeBanner);
}

export async function createAdminBanner(inputValue: unknown) {
  const actor = await assertAdmin();
  const input = adminBannerInputSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    // Locks the media row, so an artwork key cannot be orphaned by the cleanup
    // job between verification and attachment.
    await assertReadyMedia(tx, null, input.imageKey);
    const [created] = await tx
      .insert(promoBanners)
      .values({ ...bannerValues(input), createdBy: actor.id })
      .returning();
    await writeAudit(tx, actor, "banner.create", "banner", created.id, null, serializeBanner(created));
    return serializeBanner(created);
  });
  await revalidateBannerContent();
  return result;
}

export async function updateAdminBanner(idInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const input = adminBannerInputSchema.parse(inputValue);
  const result = await getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(promoBanners).where(eq(promoBanners.id, id)).for("update").limit(1);
    if (!before) throw new AdminDataError("BANNER_NOT_FOUND", "Banner not found", 404);
    const now = new Date();
    await assertReadyMedia(tx, null, input.imageKey, [before.imageKey]);
    const [updated] = await tx
      .update(promoBanners)
      .set({ ...bannerValues(input), updatedAt: now })
      .where(eq(promoBanners.id, id))
      .returning();
    await orphanUnreferencedNovelMedia(tx, [before.imageKey], now);
    await writeAudit(tx, actor, "banner.update", "banner", updated.id, serializeBanner(before), serializeBanner(updated));
    return serializeBanner(updated);
  });
  await revalidateBannerContent();
  return result;
}

export async function deleteAdminBanner(idInput: string) {
  const actor = await assertAdmin();
  const id = z.uuid().parse(idInput);
  const result = await getDb().transaction(async (tx) => {
    const [before] = await tx.select().from(promoBanners).where(eq(promoBanners.id, id)).for("update").limit(1);
    if (!before) throw new AdminDataError("BANNER_NOT_FOUND", "Banner not found", 404);
    const now = new Date();
    await assertReadyMedia(tx, null, null, [before.imageKey]);
    await tx.delete(promoBanners).where(eq(promoBanners.id, id));
    await orphanUnreferencedNovelMedia(tx, [before.imageKey], now);
    await writeAudit(tx, actor, "banner.delete", "banner", before.id, serializeBanner(before), null);
    return { id: before.id };
  });
  await revalidateBannerContent();
  return result;
}
