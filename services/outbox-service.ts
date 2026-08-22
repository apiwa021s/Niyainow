import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapters,
  domainOutboxEvents,
  notifications,
  novelFollows,
  novels,
  users,
  writerFollows,
} from "@/db/schema";

export async function processNotificationOutbox(now = new Date(), limit = 100) {
  return getDb().transaction(async (tx) => {
    const events = await tx.select().from(domainOutboxEvents).where(and(
      inArray(domainOutboxEvents.status, ["PENDING", "FAILED"]),
      lte(domainOutboxEvents.availableAt, now),
    )).orderBy(asc(domainOutboxEvents.createdAt), asc(domainOutboxEvents.id))
      .limit(Math.min(Math.max(limit, 1), 500)).for("update", { skipLocked: true });
    let processed = 0;
    let failed = 0;
    for (const event of events) {
      try {
        await tx.update(domainOutboxEvents).set({
          status: "PROCESSING",
          attempts: sql`${domainOutboxEvents.attempts} + 1`,
          lastError: null,
        }).where(eq(domainOutboxEvents.id, event.id));
        if (event.type !== "chapter_published") throw new Error(`unsupported_outbox_event:${event.type}`);
        const [chapter] = await tx.select({
          id: chapters.id,
          title: chapters.title,
          novelId: novels.id,
          novelTitle: novels.title,
          writerId: novels.writerId,
        }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId))
          .where(eq(chapters.id, event.aggregateId)).limit(1);
        if (!chapter) throw new Error("outbox_chapter_not_found");
        const [storyFollowers, creatorFollowers] = await Promise.all([
          tx.select({ userId: novelFollows.userId }).from(novelFollows).where(and(
            eq(novelFollows.novelId, chapter.novelId),
            eq(novelFollows.notificationsEnabled, true),
          )),
          chapter.writerId
            ? tx.select({ userId: writerFollows.userId }).from(writerFollows).where(and(
                eq(writerFollows.writerId, chapter.writerId),
                eq(writerFollows.storyNotificationsEnabled, true),
              ))
            : Promise.resolve([]),
        ]);
        const recipientIds = [...new Set([...storyFollowers, ...creatorFollowers].map((row) => row.userId))];
        if (recipientIds.length) {
          const recipients = await tx.select({
            id: users.id,
            hideTitle: users.hideStoryTitleInNotification,
          }).from(users).where(and(inArray(users.id, recipientIds), eq(users.status, "ACTIVE")));
          if (recipients.length) {
            await tx.insert(notifications).values(recipients.map((recipient) => ({
              userId: recipient.id,
              type: "new_chapter" as const,
              title: recipient.hideTitle ? "เรื่องที่คุณติดตามมีตอนใหม่" : `${chapter.novelTitle} มีตอนใหม่`,
              body: recipient.hideTitle ? "เปิด NovelNow เพื่ออ่านตอนล่าสุด" : chapter.title,
              entityType: "chapter",
              entityId: chapter.id,
              dedupeKey: `chapter-published:${chapter.id}`,
            }))).onConflictDoNothing();
          }
        }
        await tx.update(domainOutboxEvents).set({ status: "PROCESSED", processedAt: now, lastError: null })
          .where(eq(domainOutboxEvents.id, event.id));
        processed += 1;
      } catch (error) {
        await tx.update(domainOutboxEvents).set({
          status: "FAILED",
          lastError: error instanceof Error ? error.message.slice(0, 2_000) : "unknown_outbox_error",
          availableAt: new Date(now.getTime() + 60_000),
        }).where(eq(domainOutboxEvents.id, event.id));
        failed += 1;
      }
    }
    return { claimed: events.length, processed, failed };
  });
}
