import { and, asc, eq, isNull, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, novels } from "@/db/schema";

export async function publishDueChapters(now = new Date(), limit = 100) {
  return getDb().transaction(async (tx) => {
    const due = await tx.select({ id: chapters.id }).from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(
        eq(chapters.status, "SCHEDULED"),
        lte(chapters.scheduledFor, now),
        isNull(chapters.deletedAt),
        eq(novels.publicationStatus, "PUBLISHED"),
        isNull(novels.deletedAt),
      )).orderBy(asc(chapters.scheduledFor), asc(chapters.id)).limit(Math.min(Math.max(limit, 1), 500))
      .for("update", { of: chapters, skipLocked: true });
    const published = [];
    for (const item of due) {
      const [chapter] = await tx.update(chapters).set({
        status: "PUBLISHED",
        publishedAt: now,
        scheduledFor: null,
        updatedAt: now,
      }).where(and(eq(chapters.id, item.id), eq(chapters.status, "SCHEDULED"))).returning({
        id: chapters.id,
        novelId: chapters.novelId,
        title: chapters.title,
        publishedAt: chapters.publishedAt,
      });
      if (!chapter) continue;
      await tx.update(novels).set({ latestChapterAt: now, updatedAt: now }).where(eq(novels.id, chapter.novelId));
      published.push(chapter);
    }
    return published;
  });
}