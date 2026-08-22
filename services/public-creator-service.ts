import "server-only";

import { and, asc, eq, isNull, lte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { chapters, contentReports, novels, users, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";

export async function getPublicWriter(username: string) {
  const [writer] = await getDb().select({
    id: writerProfiles.id,
    username: writerProfiles.username,
    displayName: writerProfiles.displayName,
    bio: writerProfiles.bio,
    avatarKey: writerProfiles.avatarKey,
    coverKey: writerProfiles.coverKey,
    featuredStoryId: writerProfiles.featuredNovelId,
  }).from(writerProfiles).where(and(eq(writerProfiles.username, username.toLowerCase()), eq(writerProfiles.status, "ACTIVE"))).limit(1);
  if (!writer) throw new ApiError(404, "WRITER_NOT_FOUND", "ไม่พบนักเขียนนี้");
  return writer;
}

export async function getPublicStory(slug: string) {
  const now = new Date();
  const [story] = await getDb().select({
    id: novels.id,
    slug: novels.slug,
    title: novels.title,
    tagline: novels.tagline,
    synopsis: novels.synopsis,
    coverKey: novels.coverKey,
    heatLevel: novels.heatLevel,
    storyType: novels.storyType,
    status: novels.status,
    publishedAt: novels.publishedAt,
    writerId: writerProfiles.id,
    writerUsername: writerProfiles.username,
    writerDisplayName: writerProfiles.displayName,
  }).from(novels).leftJoin(writerProfiles, eq(writerProfiles.id, novels.writerId)).where(and(
    eq(novels.slug, slug),
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
    lte(novels.publishedAt, now),
  )).limit(1);
  if (!story) throw new ApiError(404, "STORY_NOT_FOUND", "ไม่พบนิยายนี้");
  return story;
}

export async function listPublicStoryChapters(storySlug: string) {
  const now = new Date();
  return getDb().select({
    id: chapters.id,
    chapterNumber: chapters.chapterNumber,
    slug: chapters.slug,
    title: chapters.title,
    excerpt: chapters.excerpt,
    wordCount: chapters.wordCount,
    accessMode: chapters.accessMode,
    coinPrice: chapters.coinPrice,
    publicAvailableAt: chapters.publicAvailableAt,
    publicAccessModeAfterEarlyAccess: chapters.publicAccessModeAfterEarlyAccess,
    publicCoinPrice: chapters.publicCoinPrice,
    publishedAt: chapters.publishedAt,
  }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId)).where(and(
    eq(novels.slug, storySlug),
    eq(chapters.status, "PUBLISHED"),
    isNull(chapters.deletedAt),
    lte(chapters.publishedAt, now),
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
  )).orderBy(asc(chapters.sortOrder));
}

export const privacyInputSchema = z.object({
  readingHistoryPrivate: z.boolean(),
  libraryPrivate: z.boolean(),
  hideStoryTitleInNotification: z.boolean(),
}).strict();

export async function getPrivacySettings(userId: string) {
  const [settings] = await getDb().select({
    readingHistoryPrivate: users.readingHistoryPrivate,
    libraryPrivate: users.libraryPrivate,
    hideStoryTitleInNotification: users.hideStoryTitleInNotification,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return settings;
}

export async function updatePrivacySettings(userId: string, input: z.infer<typeof privacyInputSchema>) {
  const [settings] = await getDb().update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, userId)).returning({
    readingHistoryPrivate: users.readingHistoryPrivate,
    libraryPrivate: users.libraryPrivate,
    hideStoryTitleInNotification: users.hideStoryTitleInNotification,
  });
  return settings;
}

export const contentReportInputSchema = z.object({
  entityType: z.enum(["story", "chapter", "post"]),
  entityId: z.string().uuid(),
  reason: z.string().trim().min(1).max(120),
  details: z.string().trim().max(2_000).optional().nullable(),
}).strict();

export async function createContentReport(userId: string, input: z.infer<typeof contentReportInputSchema>) {
  const [report] = await getDb().insert(contentReports).values({ reporterUserId: userId, ...input }).returning();
  return report;
}