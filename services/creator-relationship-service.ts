import "server-only";

import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { chapters, notifications, novels, users, writerFollows, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import type { NotificationFeedItem, NotificationFeedPage } from "@/types/notification";

export async function followWriter(input: {
  userId: string;
  writerId: string;
  storyNotificationsEnabled?: boolean;
  postNotificationsEnabled?: boolean;
}) {
  const [writer] = await getDb().select({ id: writerProfiles.id }).from(writerProfiles)
    .where(and(eq(writerProfiles.id, input.writerId), eq(writerProfiles.status, "ACTIVE"))).limit(1);
  if (!writer) throw new ApiError(404, "WRITER_NOT_FOUND", "ไม่พบนักเขียนนี้");
  const [follow] = await getDb().insert(writerFollows).values({
    userId: input.userId,
    writerId: input.writerId,
    storyNotificationsEnabled: input.storyNotificationsEnabled ?? true,
    postNotificationsEnabled: input.postNotificationsEnabled ?? true,
  }).onConflictDoUpdate({
    target: [writerFollows.userId, writerFollows.writerId],
    set: {
      storyNotificationsEnabled: input.storyNotificationsEnabled ?? true,
      postNotificationsEnabled: input.postNotificationsEnabled ?? true,
    },
  }).returning();
  return follow;
}

export async function unfollowWriter(userId: string, writerId: string) {
  await getDb().delete(writerFollows).where(and(eq(writerFollows.userId, userId), eq(writerFollows.writerId, writerId)));
  return { followed: false };
}

export async function listWriterFollows(userId: string) {
  return getDb().select({
    writerId: writerProfiles.id,
    username: writerProfiles.username,
    displayName: writerProfiles.displayName,
    avatarKey: writerProfiles.avatarKey,
    storyNotificationsEnabled: writerFollows.storyNotificationsEnabled,
    postNotificationsEnabled: writerFollows.postNotificationsEnabled,
    followedAt: writerFollows.createdAt,
  }).from(writerFollows).innerJoin(writerProfiles, eq(writerProfiles.id, writerFollows.writerId))
    .where(eq(writerFollows.userId, userId)).orderBy(desc(writerFollows.createdAt));
}

export async function getWriterFollowerCount(writerId: string) {
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(writerFollows)
    .where(eq(writerFollows.writerId, writerId));
  return row?.count ?? 0;
}

type NotificationCursor = { createdAt: Date; id: string };

function encodeNotificationCursor(cursor: NotificationCursor) {
  return Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`, "utf8").toString("base64url");
}

function decodeNotificationCursor(value: string): NotificationCursor {
  try {
    const [createdAtValue, id, ...rest] = Buffer.from(value, "base64url").toString("utf8").split("|");
    const createdAt = new Date(createdAtValue);
    if (
      rest.length > 0
      || !Number.isFinite(createdAt.getTime())
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)
    ) {
      throw new Error("invalid_notification_cursor");
    }
    return { createdAt, id };
  } catch {
    throw new ApiError(400, "INVALID_NOTIFICATION_CURSOR", "ตำแหน่งหน้าการแจ้งเตือนไม่ถูกต้อง");
  }
}

function notificationHref(
  notification: { type: NotificationFeedItem["type"]; entityType: string | null; entityId: string | null },
  chapterHrefs: ReadonlyMap<string, string>,
  storyHrefs: ReadonlyMap<string, string>,
) {
  if (notification.entityId && notification.entityType === "chapter") {
    return chapterHrefs.get(notification.entityId) ?? null;
  }
  if (notification.entityId && notification.entityType === "story") {
    return storyHrefs.get(notification.entityId) ?? null;
  }
  if (notification.type === "coin_purchase") return "/wallet";
  if (notification.type === "chapter_purchase") return "/library/purchased";
  if (notification.type === "membership") return "/library/membership";
  return null;
}

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return row?.count ?? 0;
}

export async function listNotifications(
  userId: string,
  options: { limit?: number; cursor?: string | null; unreadOnly?: boolean } = {},
): Promise<NotificationFeedPage> {
  const limit = Math.min(Math.max(Math.floor(options.limit ?? 20), 1), 50);
  const cursor = options.cursor ? decodeNotificationCursor(options.cursor) : null;
  const where = and(
    eq(notifications.userId, userId),
    options.unreadOnly ? eq(notifications.isRead, false) : undefined,
    cursor
      ? or(
          lt(notifications.createdAt, cursor.createdAt),
          and(eq(notifications.createdAt, cursor.createdAt), lt(notifications.id, cursor.id)),
        )
      : undefined,
  );
  const [rows, unreadCount] = await Promise.all([
    getDb().select().from(notifications).where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit + 1),
    getUnreadNotificationCount(userId),
  ]);
  const pageRows = rows.slice(0, limit);
  const chapterIds = pageRows
    .filter((item) => item.entityType === "chapter" && item.entityId)
    .map((item) => item.entityId!);
  const storyIds = pageRows
    .filter((item) => item.entityType === "story" && item.entityId)
    .map((item) => item.entityId!);
  const [chapterRows, storyRows] = await Promise.all([
    chapterIds.length
      ? getDb().select({ id: chapters.id, number: chapters.chapterNumber, novelSlug: novels.slug })
          .from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId))
          .where(inArray(chapters.id, chapterIds))
      : Promise.resolve([]),
    storyIds.length
      ? getDb().select({ id: novels.id, slug: novels.slug }).from(novels).where(inArray(novels.id, storyIds))
      : Promise.resolve([]),
  ]);
  const chapterHrefs = new Map(chapterRows.map((item) => [item.id, `/novel/${item.novelSlug}/chapter/${item.number}`]));
  const storyHrefs = new Map(storyRows.map((item) => [item.id, `/novel/${item.slug}`]));
  const items: NotificationFeedItem[] = pageRows.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    href: notificationHref(item, chapterHrefs, storyHrefs),
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
  }));
  const last = pageRows.at(-1);

  return {
    items,
    unreadCount,
    nextCursor: rows.length > limit && last
      ? encodeNotificationCursor({ createdAt: last.createdAt, id: last.id })
      : null,
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [notification] = await getDb().update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).returning();
  if (!notification) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "ไม่พบการแจ้งเตือนนี้");
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  const updated = await getDb().update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });
  return { success: true, updatedCount: updated.length, unreadCount: 0 };
}

export async function createNewChapterNotification(input: {
  userId: string;
  novelId: string;
  novelTitle: string;
  chapterTitle: string;
}) {
  const [user] = await getDb().select({ hideTitle: users.hideStoryTitleInNotification }).from(users)
    .where(eq(users.id, input.userId)).limit(1);
  const hidden = user?.hideTitle ?? true;
  const [notification] = await getDb().insert(notifications).values({
    userId: input.userId,
    type: "new_chapter",
    title: hidden ? "เรื่องที่คุณติดตามมีตอนใหม่" : `${input.novelTitle} มีตอนใหม่`,
    body: hidden ? "เปิด NovelNow เพื่ออ่านตอนล่าสุด" : input.chapterTitle,
    entityType: "story",
    entityId: input.novelId,
  }).returning();
  return notification;
}
