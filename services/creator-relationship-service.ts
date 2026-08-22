import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { notifications, users, writerFollows, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";

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

export async function listNotifications(userId: string, limit = 30) {
  return getDb().select().from(notifications).where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(Math.min(Math.max(limit, 1), 50));
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const [notification] = await getDb().update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId))).returning();
  if (!notification) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "ไม่พบการแจ้งเตือนนี้");
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  await getDb().update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return { success: true };
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