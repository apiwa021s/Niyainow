import "server-only";

import { and, desc, eq, exists, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  contentWarnings,
  genres,
  novelGenres,
  novelRelationships,
  novelSettings,
  novelStatistics,
  novelTropes,
  novels,
  relationshipTypes,
  storySettings,
  tropes,
  writerProfiles,
} from "@/db/schema";

export type DiscoverFilters = {
  genreIds?: string[];
  relationshipIds?: string[];
  settingIds?: string[];
  tropeIds?: string[];
  heatMin?: number;
  heatMax?: number;
  status?: "ongoing" | "completed" | "paused";
  sort?: "recent" | "updated" | "popular";
  page?: number;
  query?: string;
};

export async function getDiscoverStories(filters: DiscoverFilters) {
  const conditions = [eq(novels.publicationStatus, "PUBLISHED"), isNull(novels.deletedAt)];
  if (filters.genreIds?.length) conditions.push(exists(getDb().select({ one: sql`1` }).from(novelGenres).where(and(eq(novelGenres.novelId, novels.id), inArray(novelGenres.genreId, filters.genreIds)))));
  if (filters.relationshipIds?.length) conditions.push(exists(getDb().select({ one: sql`1` }).from(novelRelationships).where(and(eq(novelRelationships.novelId, novels.id), inArray(novelRelationships.relationshipTypeId, filters.relationshipIds)))));
  if (filters.settingIds?.length) conditions.push(exists(getDb().select({ one: sql`1` }).from(novelSettings).where(and(eq(novelSettings.novelId, novels.id), inArray(novelSettings.settingId, filters.settingIds)))));
  if (filters.tropeIds?.length) conditions.push(exists(getDb().select({ one: sql`1` }).from(novelTropes).where(and(eq(novelTropes.novelId, novels.id), inArray(novelTropes.tropeId, filters.tropeIds)))));
  if (filters.heatMin !== undefined) conditions.push(sql`${novels.heatLevel} >= ${filters.heatMin}`);
  if (filters.heatMax !== undefined) conditions.push(sql`${novels.heatLevel} <= ${filters.heatMax}`);
  if (filters.status) conditions.push(eq(novels.status, filters.status === "ongoing" ? "ONGOING" : filters.status === "completed" ? "COMPLETED" : "HIATUS"));
  if (filters.query) {
    const pattern = `%${filters.query.replace(/[%_\\]/gu, " ")}%`;
    conditions.push(or(ilike(novels.title, pattern), ilike(writerProfiles.displayName, pattern), ilike(writerProfiles.username, pattern))!);
  }
  const page = Math.min(Math.max(filters.page ?? 1, 1), 10_000);
  const order = filters.sort === "popular"
    ? [desc(novelStatistics.viewCount), desc(novels.id)]
    : filters.sort === "recent"
      ? [desc(novels.publishedAt), desc(novels.id)]
      : [desc(novels.latestChapterAt), desc(novels.id)];

  return getDb().select({
    id: novels.id,
    slug: novels.slug,
    title: novels.title,
    tagline: novels.tagline,
    synopsis: novels.synopsis,
    coverKey: novels.coverKey,
    heatLevel: novels.heatLevel,
    status: novels.status,
    latestChapterAt: novels.latestChapterAt,
    writerId: writerProfiles.id,
    writerUsername: writerProfiles.username,
    writerDisplayName: writerProfiles.displayName,
    views: novelStatistics.viewCount,
    followers: novelStatistics.followerCount,
  }).from(novels)
    .leftJoin(writerProfiles, eq(writerProfiles.id, novels.writerId))
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .where(and(...conditions)).orderBy(...order).limit(24).offset((page - 1) * 24);
}

export async function getTaxonomyMasterData() {
  const db = getDb();
  const [genreRows, relationshipRows, settingRows, tropeRows, warningRows] = await Promise.all([
    db.select().from(genres).where(eq(genres.isActive, true)).orderBy(genres.sortOrder),
    db.select().from(relationshipTypes).where(eq(relationshipTypes.isActive, true)).orderBy(relationshipTypes.sortOrder),
    db.select().from(storySettings).where(eq(storySettings.isActive, true)).orderBy(storySettings.sortOrder),
    db.select().from(tropes).where(eq(tropes.isActive, true)).orderBy(tropes.sortOrder),
    db.select().from(contentWarnings).where(eq(contentWarnings.isActive, true)).orderBy(contentWarnings.sortOrder),
  ]);
  return { genres: genreRows, relationships: relationshipRows, settings: settingRows, tropes: tropeRows, contentWarnings: warningRows };
}