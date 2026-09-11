import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";

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

const LEASE_MS = 5 * 60_000;
const MAX_RETRY_DELAY_MS = 60 * 60_000;

type ClaimedEvent = typeof domainOutboxEvents.$inferSelect & { claimAttempt: number };

async function claimNotificationEvents(now: Date, limit: number): Promise<ClaimedEvent[]> {
  return getDb().transaction(async (tx) => {
    const events = await tx.select().from(domainOutboxEvents).where(and(
      lte(domainOutboxEvents.availableAt, now),
      or(
        inArray(domainOutboxEvents.status, ["PENDING", "FAILED"]),
        eq(domainOutboxEvents.status, "PROCESSING"),
      ),
    )).orderBy(asc(domainOutboxEvents.createdAt), asc(domainOutboxEvents.id))
      .limit(Math.min(Math.max(limit, 1), 500)).for("update", { skipLocked: true });
    if (!events.length) return [];

    await tx.update(domainOutboxEvents).set({
      status: "PROCESSING",
      attempts: sql`${domainOutboxEvents.attempts} + 1`,
      availableAt: new Date(now.getTime() + LEASE_MS),
      lastError: null,
    }).where(inArray(domainOutboxEvents.id, events.map((event) => event.id)));

    return events.map((event) => ({ ...event, claimAttempt: event.attempts + 1 }));
  });
}

async function deliverNotificationEvent(event: ClaimedEvent, now: Date) {
  return getDb().transaction(async (tx) => {
    const [claimed] = await tx.select({ id: domainOutboxEvents.id }).from(domainOutboxEvents).where(and(
      eq(domainOutboxEvents.id, event.id),
      eq(domainOutboxEvents.status, "PROCESSING"),
      eq(domainOutboxEvents.attempts, event.claimAttempt),
    )).limit(1).for("update");
    if (!claimed) return false;
    if (event.type !== "chapter_published") throw new Error(`unsupported_outbox_event:${event.type}`);

    const [chapter] = await tx.select({
      id: chapters.id,
      title: chapters.title,
      novelId: novels.id,
      novelTitle: novels.title,
      writerId: novels.writerId,
      chapterStatus: chapters.status,
      chapterDeletedAt: chapters.deletedAt,
      novelStatus: novels.publicationStatus,
      novelDeletedAt: novels.deletedAt,
    }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(eq(chapters.id, event.aggregateId)).limit(1);
    // A hard-deleted aggregate cannot become visible again, so consuming its
    // stale publication event is safer than retrying it forever.
    if (!chapter) {
      await tx.update(domainOutboxEvents).set({
        status: "PROCESSED",
        processedAt: now,
        availableAt: now,
        lastError: "aggregate_missing_no_delivery",
      }).where(and(
        eq(domainOutboxEvents.id, event.id),
        eq(domainOutboxEvents.status, "PROCESSING"),
        eq(domainOutboxEvents.attempts, event.claimAttempt),
      ));
      return true;
    }

    const deliverable = chapter.chapterStatus === "PUBLISHED"
      && chapter.chapterDeletedAt === null
      && chapter.novelStatus === "PUBLISHED"
      && chapter.novelDeletedAt === null;
    const [storyFollowers, creatorFollowers] = deliverable ? await Promise.all([
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
    ]) : [[], []];
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

    const processed = await tx.update(domainOutboxEvents).set({
      status: "PROCESSED",
      processedAt: now,
      availableAt: now,
      lastError: null,
    }).where(and(
      eq(domainOutboxEvents.id, event.id),
      eq(domainOutboxEvents.status, "PROCESSING"),
      eq(domainOutboxEvents.attempts, event.claimAttempt),
    )).returning({ id: domainOutboxEvents.id });
    return processed.length > 0;
  });
}

async function releaseFailedEvent(event: ClaimedEvent, error: unknown, now: Date) {
  const exponentialDelay = 60_000 * (2 ** Math.min(Math.max(event.claimAttempt - 1, 0), 6));
  await getDb().update(domainOutboxEvents).set({
    status: "FAILED",
    lastError: error instanceof Error ? error.message.slice(0, 2_000) : "unknown_outbox_error",
    availableAt: new Date(now.getTime() + Math.min(exponentialDelay, MAX_RETRY_DELAY_MS)),
  }).where(and(
    eq(domainOutboxEvents.id, event.id),
    eq(domainOutboxEvents.status, "PROCESSING"),
    eq(domainOutboxEvents.attempts, event.claimAttempt),
  ));
}

/**
 * Claims a bounded batch with a renewable-by-reclaim lease, then delivers each
 * event in its own transaction. A poison event cannot roll back healthy work,
 * and a worker crash is recovered after the lease expires. Notification
 * dedupe keys keep retries exactly-once from the reader's point of view.
 */
export async function processNotificationOutbox(now = new Date(), limit = 100) {
  const events = await claimNotificationEvents(now, limit);
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      if (await deliverNotificationEvent(event, new Date())) processed += 1;
    } catch (error) {
      await releaseFailedEvent(event, error, new Date());
      failed += 1;
    }
  }

  return { claimed: events.length, processed, failed };
}
