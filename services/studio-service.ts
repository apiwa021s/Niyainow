import "server-only";

import { and, asc, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import {
  chapterContentWarnings,
  chapters,
  contentWarnings,
  creatorRevenueContracts,
  domainOutboxEvents,
  genres,
  novelContentWarnings,
  novelGenres,
  novelRelationships,
  novelSettings,
  novelTropes,
  novels,
  relationshipTypes,
  storySettings,
  tags,
  tropes,
  writerProfileTags,
  writerProfiles,
} from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { createUniqueSlug } from "@/lib/validation/slug";

const masterSlug = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/u);

export const writerProfileInputSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(80).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u),
  displayName: z.string().trim().min(1).max(160),
  bio: z.string().trim().max(2_000).optional().nullable(),
  avatarKey: z.string().trim().max(500).optional().nullable(),
  coverKey: z.string().trim().max(500).optional().nullable(),
  featuredStoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(5).default([]),
}).strict();

export const studioStoryInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200).optional().nullable(),
  synopsis: z.string().trim().min(1).max(3_000),
  coverKey: z.string().trim().max(500).optional().nullable(),
  primaryGenreId: masterSlug,
  secondaryGenreIds: z.array(masterSlug).max(2).default([]),
  relationshipIds: z.array(masterSlug).length(1),
  settingIds: z.array(masterSlug).max(2).default([]),
  tropeIds: z.array(masterSlug).min(1).max(6),
  heatLevel: z.number().int().min(1).max(5),
  contentWarningIds: z.array(masterSlug).max(14).default([]),
  storyType: z.enum(["serial", "complete_novel", "oneshot", "anthology"]),
  storyStatus: z.enum(["ongoing", "completed", "paused"]),
  originType: z.enum(["original", "licensed_translation", "licensed_adaptation"]),
  originalTitle: z.string().trim().max(500).optional().nullable(),
  rightsHolder: z.string().trim().max(500).optional().nullable(),
  rightsNote: z.string().trim().max(2_000).optional().nullable(),
  rightsDocumentReference: z.string().trim().max(500).optional().nullable(),
  rightsConfirmed: z.literal(true),
  contentPolicyConfirmed: z.literal(true),
}).strict().superRefine((input, context) => {
  if (input.secondaryGenreIds.includes(input.primaryGenreId)) {
    context.addIssue({ code: "custom", path: ["secondaryGenreIds"], message: "Primary genre cannot also be secondary" });
  }
  if (new Set(input.secondaryGenreIds).size !== input.secondaryGenreIds.length
    || new Set(input.settingIds).size !== input.settingIds.length
    || new Set(input.tropeIds).size !== input.tropeIds.length
    || new Set(input.contentWarningIds).size !== input.contentWarningIds.length) {
    context.addIssue({ code: "custom", message: "Duplicate taxonomy values are not allowed" });
  }
  if (input.originType !== "original" && (!input.originalTitle || !input.rightsHolder)) {
    context.addIssue({ code: "custom", path: ["rightsHolder"], message: "Licensed content requires original title and rights holder" });
  }
});

export type StudioStoryInput = z.infer<typeof studioStoryInputSchema>;

const chapterAccessFields = {
  accessMode: z.enum(["free", "paid", "early_access", "members_only"]),
  coinPrice: z.number().int().min(0).max(1_000_000).default(0),
  inheritStoryHeatLevel: z.boolean().default(true),
  heatLevel: z.number().int().min(1).max(5).optional().nullable(),
  inheritStoryWarnings: z.boolean().default(true),
  contentWarningIds: z.array(masterSlug).max(14).default([]),
  memberAvailableAt: z.iso.datetime({ offset: true }).optional().nullable(),
  publicAvailableAt: z.iso.datetime({ offset: true }).optional().nullable(),
  publicAccessModeAfterEarlyAccess: z.enum(["free", "paid"]).optional().nullable(),
  publicCoinPrice: z.number().int().positive().max(1_000_000).optional().nullable(),
};

function validateChapterAccess(input: z.infer<z.ZodObject<typeof chapterAccessFields>>, context: z.RefinementCtx) {
  if (input.accessMode === "free" && input.coinPrice !== 0) context.addIssue({ code: "custom", path: ["coinPrice"], message: "Free chapters cannot have a coin price" });
  if (input.accessMode === "paid" && input.coinPrice <= 0) context.addIssue({ code: "custom", path: ["coinPrice"], message: "Paid chapters require a coin price" });
  if ((input.accessMode === "early_access" || input.accessMode === "members_only") && input.coinPrice !== 0) context.addIssue({ code: "custom", path: ["coinPrice"], message: "Membership access does not use the direct coin price" });
  if (input.accessMode === "early_access") {
    if (!input.publicAvailableAt || !input.publicAccessModeAfterEarlyAccess) context.addIssue({ code: "custom", path: ["publicAvailableAt"], message: "Early access requires a public release policy" });
    if (input.publicAccessModeAfterEarlyAccess === "paid" && !input.publicCoinPrice) context.addIssue({ code: "custom", path: ["publicCoinPrice"], message: "Paid public release requires a price" });
    if (input.publicAccessModeAfterEarlyAccess === "free" && input.publicCoinPrice) context.addIssue({ code: "custom", path: ["publicCoinPrice"], message: "Free public release cannot have a price" });
  } else if (input.publicAvailableAt || input.publicAccessModeAfterEarlyAccess || input.publicCoinPrice) {
    context.addIssue({ code: "custom", path: ["publicAvailableAt"], message: "Public release fields are only valid for early access" });
  }
  if (input.inheritStoryHeatLevel && input.heatLevel) context.addIssue({ code: "custom", path: ["heatLevel"], message: "Inherited heat cannot be overridden" });
  if (!input.inheritStoryHeatLevel && !input.heatLevel) context.addIssue({ code: "custom", path: ["heatLevel"], message: "Heat override is required" });
  if (input.inheritStoryWarnings && input.contentWarningIds.length > 0) context.addIssue({ code: "custom", path: ["contentWarningIds"], message: "Inherited warnings cannot be overridden" });
}

export const studioChapterInputSchema = z.object({
  chapterNumber: z.number().finite().min(0).max(99_999_999.99),
  title: z.string().trim().min(1).max(500),
  content: z.string().max(2_000_000).default(""),
  ...chapterAccessFields,
}).strict().superRefine(validateChapterAccess);

export const studioChapterUpdateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).max(500),
  content: z.string().max(2_000_000),
  ...chapterAccessFields,
}).strict().superRefine(validateChapterAccess);

export const studioChapterScheduleSchema = z.object({ scheduledAt: z.iso.datetime({ offset: true }) }).strict();

type StudioChapterAccessInput = Pick<z.infer<typeof studioChapterInputSchema>, keyof typeof chapterAccessFields>;

function countWords(content: string) {
  return content.trim() ? content.trim().split(/\s+/u).length : 0;
}

function chapterAccessValues(input: StudioChapterAccessInput) {
  return {
    accessMode: input.accessMode,
    isFree: input.accessMode === "free",
    coinPrice: input.accessMode === "paid" ? input.coinPrice : 0,
    inheritStoryHeatLevel: input.inheritStoryHeatLevel,
    heatLevel: input.inheritStoryHeatLevel ? null : input.heatLevel,
    inheritStoryWarnings: input.inheritStoryWarnings,
    memberAvailableAt: input.memberAvailableAt ? new Date(input.memberAvailableAt) : null,
    publicAvailableAt: input.publicAvailableAt ? new Date(input.publicAvailableAt) : null,
    publicAccessModeAfterEarlyAccess: input.publicAccessModeAfterEarlyAccess,
    publicCoinPrice: input.publicAccessModeAfterEarlyAccess === "paid" ? input.publicCoinPrice : null,
  };
}

export async function getWriterProfileForUser(userId: string) {
  const [profile] = await getDb().select().from(writerProfiles).where(eq(writerProfiles.userId, userId)).limit(1);
  return profile ?? null;
}

export async function requireWriterProfileForUser(userId: string) {
  const profile = await getWriterProfileForUser(userId);
  if (!profile || profile.status !== "ACTIVE") {
    throw new ApiError(403, "WRITER_PROFILE_REQUIRED", "กรุณาสร้างโปรไฟล์นักเขียนก่อนใช้งาน Studio");
  }
  return profile;
}

export async function createWriterProfile(userId: string, input: z.infer<typeof writerProfileInputSchema>) {
  try {
    return await getDb().transaction(async (tx) => {
      const { tagIds } = input;
      const profileInput = {
        username: input.username,
        displayName: input.displayName,
        bio: input.bio,
        avatarKey: input.avatarKey,
        coverKey: input.coverKey,
      };
      const tagRows = tagIds.length
        ? await tx.select({ id: tags.id }).from(tags).where(and(inArray(tags.id, tagIds), eq(tags.isActive, true)))
        : [];
      if (tagRows.length !== new Set(tagIds).size) throw new ApiError(400, "INVALID_WRITER_TAGS", "มีแท็กนักเขียนที่ไม่ถูกต้องหรือปิดใช้งานแล้ว");
      const [profile] = await tx.insert(writerProfiles).values({ userId, ...profileInput }).returning();
      if (!profile) throw new Error("writer_profile_write_failed");
      if (tagRows.length) await tx.insert(writerProfileTags).values(tagRows.map((tag, index) => ({ writerId: profile.id, tagId: tag.id, sortOrder: index })));
      return profile;
    });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      throw new ApiError(409, "WRITER_PROFILE_CONFLICT", "Username นี้ถูกใช้งานแล้ว หรือบัญชีมีโปรไฟล์นักเขียนอยู่แล้ว");
    }
    throw error;
  }
}

export async function updateWriterProfile(userId: string, input: z.infer<typeof writerProfileInputSchema>) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().transaction(async (tx) => {
    const uniqueTagIds = [...new Set(input.tagIds)];
    const tagRows = uniqueTagIds.length
      ? await tx.select({ id: tags.id }).from(tags).where(and(inArray(tags.id, uniqueTagIds), eq(tags.isActive, true)))
      : [];
    if (tagRows.length !== uniqueTagIds.length) throw new ApiError(400, "INVALID_WRITER_TAGS", "มีแท็กนักเขียนที่ไม่ถูกต้องหรือปิดใช้งานแล้ว");
    if (input.featuredStoryId) {
      const [featured] = await tx.select({ id: novels.id }).from(novels).where(and(
        eq(novels.id, input.featuredStoryId),
        eq(novels.writerId, writer.id),
        isNull(novels.deletedAt),
      )).limit(1);
      if (!featured) throw new ApiError(400, "INVALID_FEATURED_STORY", "เรื่องแนะนำต้องเป็นผลงานของนักเขียนคนนี้");
    }
    const [updated] = await tx.update(writerProfiles).set({
      username: input.username,
      displayName: input.displayName,
      bio: input.bio,
      avatarKey: input.avatarKey,
      coverKey: input.coverKey,
      featuredNovelId: input.featuredStoryId,
      updatedAt: new Date(),
    }).where(and(eq(writerProfiles.id, writer.id), eq(writerProfiles.userId, userId))).returning();
    await tx.delete(writerProfileTags).where(eq(writerProfileTags.writerId, writer.id));
    if (tagRows.length) await tx.insert(writerProfileTags).values(tagRows.map((tag, index) => ({ writerId: writer.id, tagId: tag.id, sortOrder: index })));
    return updated;
  });
}

export async function listWriterStories(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb()
    .select({
      id: novels.id,
      slug: novels.slug,
      title: novels.title,
      tagline: novels.tagline,
      status: novels.status,
      publishStatus: novels.publicationStatus,
      heatLevel: novels.heatLevel,
      updatedAt: novels.updatedAt,
      publishedAt: novels.publishedAt,
    })
    .from(novels)
    .where(and(eq(novels.writerId, writer.id), isNull(novels.deletedAt)))
    .orderBy(desc(novels.updatedAt), desc(novels.id));
}

async function resolveMasterIds(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  input: StudioStoryInput,
) {
  const genreSlugs = [input.primaryGenreId, ...input.secondaryGenreIds];
  const [genreRows, relationshipRows, settingRows, tropeRows, warningRows] = await Promise.all([
    tx.select({ id: genres.id, slug: genres.slug }).from(genres).where(and(inArray(genres.slug, genreSlugs), eq(genres.isActive, true))),
    tx.select({ id: relationshipTypes.id, slug: relationshipTypes.slug }).from(relationshipTypes).where(and(inArray(relationshipTypes.slug, input.relationshipIds), eq(relationshipTypes.isActive, true))),
    input.settingIds.length ? tx.select({ id: storySettings.id, slug: storySettings.slug }).from(storySettings).where(and(inArray(storySettings.slug, input.settingIds), eq(storySettings.isActive, true))) : Promise.resolve([]),
    tx.select({ id: tropes.id, slug: tropes.slug }).from(tropes).where(and(inArray(tropes.slug, input.tropeIds), eq(tropes.isActive, true))),
    input.contentWarningIds.length ? tx.select({ id: contentWarnings.id, slug: contentWarnings.slug }).from(contentWarnings).where(and(inArray(contentWarnings.slug, input.contentWarningIds), eq(contentWarnings.isActive, true))) : Promise.resolve([]),
  ]);
  if (genreRows.length !== genreSlugs.length || relationshipRows.length !== input.relationshipIds.length
    || settingRows.length !== input.settingIds.length || tropeRows.length !== input.tropeIds.length
    || warningRows.length !== input.contentWarningIds.length) {
    throw new ApiError(400, "INVALID_TAXONOMY", "มีหมวดหมู่ที่ไม่ถูกต้องหรือปิดใช้งานแล้ว");
  }
  return { genreRows, relationshipRows, settingRows, tropeRows, warningRows };
}

export async function createWriterStory(userId: string, input: StudioStoryInput) {
  const writer = await requireWriterProfileForUser(userId);
  const db = getDb();
  const slug = await createUniqueSlug(input.title, async (candidate) => {
    const [row] = await db.select({ id: novels.id }).from(novels).where(eq(novels.slug, candidate)).limit(1);
    return Boolean(row);
  }, "story");
  const now = new Date();

  return db.transaction(async (tx) => {
    const masters = await resolveMasterIds(tx, input);
    const [story] = await tx.insert(novels).values({
      writerId: writer.id,
      slug,
      title: input.title,
      tagline: input.tagline,
      synopsis: input.synopsis,
      coverKey: input.coverKey,
      titleOriginal: input.originalTitle,
      status: input.storyStatus === "ongoing" ? "ONGOING" : input.storyStatus === "completed" ? "COMPLETED" : "HIATUS",
      publicationStatus: "DRAFT",
      contentRating: "ADULT",
      heatLevel: input.heatLevel,
      storyType: input.storyType,
      originType: input.originType,
      rightsHolder: input.rightsHolder,
      rightsNote: input.rightsNote,
      rightsDocumentReference: input.rightsDocumentReference,
      rightsConfirmedAt: now,
      contentPolicyConfirmedAt: now,
      createdBy: userId,
      updatedBy: userId,
    }).returning();
    if (!story) throw new Error("story_write_failed");

    const genreBySlug = new Map(masters.genreRows.map((row) => [row.slug, row.id]));
    await tx.insert(novelGenres).values([
      { novelId: story.id, genreId: genreBySlug.get(input.primaryGenreId)!, isPrimary: true, sortOrder: 0 },
      ...input.secondaryGenreIds.map((slugValue, index) => ({ novelId: story.id, genreId: genreBySlug.get(slugValue)!, isPrimary: false, sortOrder: index + 1 })),
    ]);
    await tx.insert(novelRelationships).values(masters.relationshipRows.map((row) => ({ novelId: story.id, relationshipTypeId: row.id })));
    if (masters.settingRows.length) await tx.insert(novelSettings).values(masters.settingRows.map((row) => ({ novelId: story.id, settingId: row.id })));
    await tx.insert(novelTropes).values(masters.tropeRows.map((row) => ({ novelId: story.id, tropeId: row.id })));
    if (masters.warningRows.length) await tx.insert(novelContentWarnings).values(masters.warningRows.map((row) => ({ novelId: story.id, contentWarningId: row.id })));
    return story;
  });
}

async function getOwnedStory(userId: string, storyId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [story] = await getDb()
    .select({ id: novels.id, writerId: novels.writerId, slug: novels.slug })
    .from(novels)
    .where(and(eq(novels.id, storyId), eq(novels.writerId, writer.id), isNull(novels.deletedAt)))
    .limit(1);
  if (!story) throw new ApiError(404, "STORY_NOT_FOUND", "ไม่พบผลงานนี้");
  return { writer, story };
}

export async function listWriterChapters(userId: string, storyId: string) {
  await getOwnedStory(userId, storyId);
  return getDb().select({
    id: chapters.id,
    chapterNumber: chapters.chapterNumber,
    title: chapters.title,
    status: chapters.status,
    accessMode: chapters.accessMode,
    coinPrice: chapters.coinPrice,
    version: chapters.version,
    scheduledAt: chapters.scheduledFor,
    publishedAt: chapters.publishedAt,
    updatedAt: chapters.updatedAt,
  }).from(chapters).where(and(eq(chapters.novelId, storyId), isNull(chapters.deletedAt))).orderBy(asc(chapters.sortOrder));
}

async function replaceChapterWarnings(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  chapterId: string,
  inheritWarnings: boolean,
  warningSlugs: string[],
) {
  await tx.delete(chapterContentWarnings).where(eq(chapterContentWarnings.chapterId, chapterId));
  if (inheritWarnings || warningSlugs.length === 0) return;
  const rows = await tx.select({ id: contentWarnings.id }).from(contentWarnings)
    .where(and(inArray(contentWarnings.slug, warningSlugs), eq(contentWarnings.isActive, true)));
  if (rows.length !== warningSlugs.length) throw new ApiError(400, "INVALID_TAXONOMY", "มีคำเตือนเนื้อหาที่ไม่ถูกต้อง");
  await tx.insert(chapterContentWarnings).values(rows.map((row) => ({ chapterId, contentWarningId: row.id })));
}

export async function createWriterChapter(
  userId: string,
  storyId: string,
  input: z.infer<typeof studioChapterInputSchema>,
) {
  const { story } = await getOwnedStory(userId, storyId);
  return getDb().transaction(async (tx) => {
    await tx.select({ id: novels.id }).from(novels).where(eq(novels.id, story.id)).for("update");
    const [order] = await tx.select({ value: max(chapters.sortOrder) }).from(chapters).where(eq(chapters.novelId, story.id));
    const [chapter] = await tx.insert(chapters).values({
      novelId: story.id,
      chapterNumber: input.chapterNumber,
      sortOrder: (order?.value ?? 0) + 1,
      slug: `chapter-${String(input.chapterNumber).replace(".", "-")}`,
      title: input.title,
      content: input.content,
      wordCount: countWords(input.content),
      status: "DRAFT",
      ...chapterAccessValues(input),
      createdBy: userId,
      updatedBy: userId,
    }).returning();
    if (!chapter) throw new Error("chapter_write_failed");
    await replaceChapterWarnings(tx, chapter.id, input.inheritStoryWarnings, input.contentWarningIds);
    return chapter;
  });
}

export async function updateWriterChapter(
  userId: string,
  chapterId: string,
  input: z.infer<typeof studioChapterUpdateSchema>,
) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().transaction(async (tx) => {
    const [owned] = await tx.select({ id: chapters.id }).from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(eq(chapters.id, chapterId), eq(novels.writerId, writer.id), isNull(chapters.deletedAt), isNull(novels.deletedAt)))
      .limit(1);
    if (!owned) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนนี้");
    const [chapter] = await tx.update(chapters).set({
      title: input.title,
      content: input.content,
      wordCount: countWords(input.content),
      ...chapterAccessValues(input),
      version: sql`${chapters.version} + 1`,
      updatedBy: userId,
      updatedAt: new Date(),
    }).where(and(eq(chapters.id, chapterId), eq(chapters.version, input.expectedVersion))).returning();
    if (!chapter) throw new ApiError(409, "VERSION_CONFLICT", "ตอนนี้ถูกแก้ไขจากอุปกรณ์อื่น กรุณาโหลดข้อมูลล่าสุด");
    await replaceChapterWarnings(tx, chapter.id, input.inheritStoryWarnings, input.contentWarningIds);
    return chapter;
  });
}

async function getOwnedChapter(userId: string, chapterId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [row] = await getDb().select({
    chapterId: chapters.id,
    novelId: chapters.novelId,
    content: chapters.content,
    accessMode: chapters.accessMode,
    publicAccessMode: chapters.publicAccessModeAfterEarlyAccess,
  }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), eq(novels.writerId, writer.id), isNull(chapters.deletedAt), isNull(novels.deletedAt)))
    .limit(1);
  if (!row) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนนี้");
  return { writer, row };
}

async function requirePublishableChapter(userId: string, chapterId: string) {
  const owned = await getOwnedChapter(userId, chapterId);
  if (!owned.row.content.trim()) throw new ApiError(400, "EMPTY_CHAPTER", "ไม่สามารถเผยแพร่ตอนที่ไม่มีเนื้อหา");
  const needsContract = owned.row.accessMode === "paid"
    || (owned.row.accessMode === "early_access" && owned.row.publicAccessMode === "paid");
  if (needsContract) {
    const now = new Date();
    const [contract] = await getDb().select({ id: creatorRevenueContracts.id }).from(creatorRevenueContracts)
      .where(and(
        eq(creatorRevenueContracts.writerId, owned.writer.id),
        eq(creatorRevenueContracts.status, "ACTIVE"),
        sql`${creatorRevenueContracts.effectiveFrom} <= ${now}`,
        sql`(${creatorRevenueContracts.effectiveTo} is null or ${creatorRevenueContracts.effectiveTo} > ${now})`,
      )).limit(1);
    if (!contract) throw new ApiError(409, "REVENUE_CONTRACT_REQUIRED", "ต้องมีสัญญาแบ่งรายได้ที่ใช้งานอยู่ก่อนเผยแพร่ตอนแบบใช้ Coins");
  }
  return owned.row;
}

export async function publishWriterChapter(userId: string, chapterId: string) {
  const row = await requirePublishableChapter(userId, chapterId);
  const now = new Date();
  return getDb().transaction(async (tx) => {
    const [chapter] = await tx.update(chapters).set({ status: "PUBLISHED", publishedAt: now, scheduledFor: null, updatedAt: now })
      .where(and(eq(chapters.id, row.chapterId), ne(chapters.status, "PUBLISHED"))).returning();
    if (!chapter) {
      const [existing] = await tx.select().from(chapters).where(eq(chapters.id, row.chapterId)).limit(1);
      return existing;
    }
    await tx.update(novels).set({ latestChapterAt: now, updatedAt: now }).where(eq(novels.id, chapter.novelId));
    await tx.insert(domainOutboxEvents).values({
      type: "chapter_published",
      aggregateType: "chapter",
      aggregateId: chapter.id,
      dedupeKey: `chapter-published:${chapter.id}`,
      payload: { chapterId: chapter.id, novelId: chapter.novelId },
    }).onConflictDoNothing();
    return chapter;
  });
}

export async function scheduleWriterChapter(userId: string, chapterId: string, scheduledAt: Date) {
  await requirePublishableChapter(userId, chapterId);
  if (scheduledAt <= new Date()) throw new ApiError(400, "INVALID_SCHEDULE", "เวลานัดเผยแพร่ต้องอยู่ในอนาคต");
  const [chapter] = await getDb().update(chapters).set({ status: "SCHEDULED", scheduledFor: scheduledAt, publishedAt: null, updatedAt: new Date() })
    .where(eq(chapters.id, chapterId)).returning();
  return chapter;
}

export async function unpublishWriterChapter(userId: string, chapterId: string) {
  const { row } = await getOwnedChapter(userId, chapterId);
  const [chapter] = await getDb().update(chapters).set({ status: "UNPUBLISHED", scheduledFor: null, updatedAt: new Date() })
    .where(eq(chapters.id, row.chapterId)).returning();
  return chapter;
}

export async function getWriterChapter(userId: string, chapterId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [chapter] = await getDb().select({
    id: chapters.id,
    novelId: chapters.novelId,
    chapterNumber: chapters.chapterNumber,
    title: chapters.title,
    content: chapters.content,
    wordCount: chapters.wordCount,
    status: chapters.status,
    accessMode: chapters.accessMode,
    coinPrice: chapters.coinPrice,
    inheritStoryHeatLevel: chapters.inheritStoryHeatLevel,
    heatLevel: chapters.heatLevel,
    inheritStoryWarnings: chapters.inheritStoryWarnings,
    memberAvailableAt: chapters.memberAvailableAt,
    publicAvailableAt: chapters.publicAvailableAt,
    publicAccessModeAfterEarlyAccess: chapters.publicAccessModeAfterEarlyAccess,
    publicCoinPrice: chapters.publicCoinPrice,
    version: chapters.version,
    scheduledAt: chapters.scheduledFor,
    publishedAt: chapters.publishedAt,
    updatedAt: chapters.updatedAt,
  }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), eq(novels.writerId, writer.id), isNull(chapters.deletedAt), isNull(novels.deletedAt)))
    .limit(1);
  if (!chapter) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนนี้");
  return chapter;
}

export async function getWriterStory(userId: string, storyId: string) {
  await getOwnedStory(userId, storyId);
  const [story] = await getDb().select().from(novels).where(eq(novels.id, storyId)).limit(1);
  return story;
}

export async function updateWriterStory(userId: string, storyId: string, input: StudioStoryInput) {
  const { story, writer } = await getOwnedStory(userId, storyId);
  const now = new Date();
  return getDb().transaction(async (tx) => {
    const masters = await resolveMasterIds(tx, input);
    const [updated] = await tx.update(novels).set({
      title: input.title,
      tagline: input.tagline,
      synopsis: input.synopsis,
      coverKey: input.coverKey,
      titleOriginal: input.originalTitle,
      status: input.storyStatus === "ongoing" ? "ONGOING" : input.storyStatus === "completed" ? "COMPLETED" : "HIATUS",
      contentRating: "ADULT",
      heatLevel: input.heatLevel,
      storyType: input.storyType,
      originType: input.originType,
      rightsHolder: input.rightsHolder,
      rightsNote: input.rightsNote,
      rightsDocumentReference: input.rightsDocumentReference,
      rightsConfirmedAt: now,
      contentPolicyConfirmedAt: now,
      updatedBy: userId,
      updatedAt: now,
    }).where(and(eq(novels.id, story.id), eq(novels.writerId, writer.id))).returning();
    if (!updated) throw new ApiError(404, "STORY_NOT_FOUND", "ไม่พบผลงานนี้");

    await Promise.all([
      tx.delete(novelGenres).where(eq(novelGenres.novelId, story.id)),
      tx.delete(novelRelationships).where(eq(novelRelationships.novelId, story.id)),
      tx.delete(novelSettings).where(eq(novelSettings.novelId, story.id)),
      tx.delete(novelTropes).where(eq(novelTropes.novelId, story.id)),
      tx.delete(novelContentWarnings).where(eq(novelContentWarnings.novelId, story.id)),
    ]);
    const genreBySlug = new Map(masters.genreRows.map((row) => [row.slug, row.id]));
    await tx.insert(novelGenres).values([
      { novelId: story.id, genreId: genreBySlug.get(input.primaryGenreId)!, isPrimary: true, sortOrder: 0 },
      ...input.secondaryGenreIds.map((slugValue, index) => ({ novelId: story.id, genreId: genreBySlug.get(slugValue)!, isPrimary: false, sortOrder: index + 1 })),
    ]);
    await tx.insert(novelRelationships).values(masters.relationshipRows.map((row) => ({ novelId: story.id, relationshipTypeId: row.id })));
    if (masters.settingRows.length) await tx.insert(novelSettings).values(masters.settingRows.map((row) => ({ novelId: story.id, settingId: row.id })));
    await tx.insert(novelTropes).values(masters.tropeRows.map((row) => ({ novelId: story.id, tropeId: row.id })));
    if (masters.warningRows.length) await tx.insert(novelContentWarnings).values(masters.warningRows.map((row) => ({ novelId: story.id, contentWarningId: row.id })));
    return updated;
  });
}

export async function publishWriterStory(userId: string, storyId: string) {
  const { story } = await getOwnedStory(userId, storyId);
  const now = new Date();
  const [updated] = await getDb().update(novels).set({ publicationStatus: "PUBLISHED", publishedAt: now, updatedAt: now })
    .where(eq(novels.id, story.id)).returning();
  return updated;
}

export async function setWriterStoryStatus(userId: string, storyId: string, status: "COMPLETED" | "HIATUS") {
  const { story } = await getOwnedStory(userId, storyId);
  const [updated] = await getDb().update(novels).set({ status, updatedAt: new Date() })
    .where(eq(novels.id, story.id)).returning();
  return updated;
}