import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { worldCharacters } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { getFeaturedNovels, getRecommendedNovels } from "@/services/novel-service";
import { getHomePersonalization, listFollowedNovels } from "@/services/user-service";
import type { Novel } from "@/types/novel";
import {
  DEFAULT_CHARACTER_APPEARANCE,
  WORLD_ID,
  worldCharacterAppearanceSchema,
  type WorldCatalog,
  type WorldCharacter,
  type WorldCharacterAppearance,
  type WorldNovel,
} from "@/world/types";

function mapCharacter(row: typeof worldCharacters.$inferSelect): WorldCharacter {
  const appearance = worldCharacterAppearanceSchema.safeParse({
    bodyPreset: row.bodyPreset,
    skinTone: row.skinTone,
    faceId: row.faceId,
    eyeId: row.eyeId,
    hairId: row.hairId,
    hairColor: row.hairColor,
    topId: row.topId,
    bottomId: row.bottomId,
    shoesId: row.shoesId,
    accessoryIds: row.accessoryIds,
  });

  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    ...(appearance.success ? appearance.data : DEFAULT_CHARACTER_APPEARANCE),
    title: row.title ?? undefined,
    currentWorld: row.currentWorld,
    x: row.x,
    y: row.y,
    introCompleted: row.introCompleted,
  };
}

export async function getWorldCharacter(userId: string): Promise<WorldCharacter | null> {
  const [row] = await getDb().select().from(worldCharacters).where(eq(worldCharacters.userId, userId)).limit(1);
  return row ? mapCharacter(row) : null;
}

export async function saveWorldCharacter(
  userId: string,
  input: WorldCharacterAppearance & { displayName: string },
): Promise<WorldCharacter> {
  const [nameOwner] = await getDb()
    .select({ id: worldCharacters.id })
    .from(worldCharacters)
    .where(and(sql`lower(${worldCharacters.displayName}) = lower(${input.displayName})`, ne(worldCharacters.userId, userId)))
    .limit(1);
  if (nameOwner) throw new ApiError(409, "WORLD_NAME_TAKEN", "ชื่อนี้มีนักอ่านใช้แล้ว");

  const now = new Date();
  const [row] = await getDb()
    .insert(worldCharacters)
    .values({
      userId,
      ...input,
      currentWorld: WORLD_ID,
      x: 1200,
      y: 1260,
      updatedAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: worldCharacters.userId,
      set: { ...input, updatedAt: now },
    })
    .returning();
  if (!row) throw new ApiError(500, "WORLD_CHARACTER_SAVE_FAILED", "บันทึกตัวละครไม่สำเร็จ");
  return mapCharacter(row);
}

export async function saveWorldPosition(userId: string, input: { worldId: string; x: number; y: number }) {
  const now = new Date();
  const [row] = await getDb()
    .update(worldCharacters)
    .set({ currentWorld: input.worldId, x: input.x, y: input.y, lastSeenAt: now, updatedAt: now })
    .where(eq(worldCharacters.userId, userId))
    .returning({ id: worldCharacters.id });
  if (!row) throw new ApiError(404, "WORLD_CHARACTER_NOT_FOUND", "กรุณาสร้างตัวละครก่อนเข้าโลก");
  return { saved: true, savedAt: now.toISOString() };
}

export async function completeWorldIntro(userId: string) {
  const [row] = await getDb()
    .update(worldCharacters)
    .set({ introCompleted: true, updatedAt: new Date() })
    .where(eq(worldCharacters.userId, userId))
    .returning({ id: worldCharacters.id });
  if (!row) throw new ApiError(404, "WORLD_CHARACTER_NOT_FOUND", "กรุณาสร้างตัวละครก่อนเข้าโลก");
  return { completed: true };
}

function novelReadHref(novel: Novel, preferredChapter?: number) {
  const chapter = preferredChapter ?? novel.latestChapter?.number;
  return chapter !== undefined
    ? `/novel/${novel.slug}/chapter/${chapter}?from=world`
    : `/novel/${novel.slug}?from=world`;
}

function toWorldNovel(novel: Novel, options: { progress?: number; chapterNumber?: number; chapterLabel?: string } = {}): WorldNovel {
  return {
    id: novel.id ?? novel.slug,
    slug: novel.slug,
    title: novel.thaiTitle,
    author: novel.author,
    cover: novel.cover,
    synopsis: novel.synopsis,
    chapters: novel.chapters,
    status: novel.status,
    readHref: novelReadHref(novel, options.chapterNumber),
    progress: options.progress,
    chapterLabel: options.chapterLabel,
  };
}

/** Catalog reads are isolated so a failed recommendation shelf never crashes the world. */
export async function getWorldCatalog(userId: string): Promise<WorldCatalog> {
  const [trendingResult, recommendationsResult, personalizationResult, followedResult] = await Promise.allSettled([
    getFeaturedNovels(12),
    getRecommendedNovels(12),
    getHomePersonalization(userId),
    listFollowedNovels(userId, 12),
  ]);

  const trending = trendingResult.status === "fulfilled" ? trendingResult.value.map((novel) => toWorldNovel(novel)) : [];
  const recommendations = recommendationsResult.status === "fulfilled"
    ? recommendationsResult.value.map((novel) => toWorldNovel(novel))
    : [];
  const continueReading = personalizationResult.status === "fulfilled"
    ? personalizationResult.value.continueReading.map((item) => toWorldNovel(item.novel, {
        progress: item.progressPercent ?? 0,
        chapterNumber: item.chapter?.number,
        chapterLabel: item.chapter ? `ตอน ${item.chapter.number} · ${item.chapter.title}` : undefined,
      }))
    : [];
  const followed = followedResult.status === "fulfilled"
    ? followedResult.value.map((item) => toWorldNovel(item.novel, {
        progress: item.progressPercent ?? undefined,
        chapterNumber: item.chapter?.number,
        chapterLabel: item.chapter ? `ตอน ${item.chapter.number} · ${item.chapter.title}` : undefined,
      }))
    : [];

  return {
    trending: trending.length ? trending : recommendations.slice(0, 8),
    continueReading,
    followed,
    recommendations,
  };
}
