import "server-only";

import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { readerMemberships, writerFollows, writerPosts, writerProfiles } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";

import { requireWriterProfileForUser } from "./studio-service";

export const writerPostInputSchema = z.object({
  content: z.string().trim().min(1).max(10_000),
  imageKey: z.string().trim().max(500).optional().nullable(),
  visibility: z.enum(["public", "followers", "members"]),
  status: z.enum(["draft", "published"]).default("published"),
}).strict();

export async function listStudioPosts(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().select().from(writerPosts).where(eq(writerPosts.writerId, writer.id))
    .orderBy(desc(writerPosts.createdAt), desc(writerPosts.id));
}

export async function createStudioPost(userId: string, input: z.infer<typeof writerPostInputSchema>) {
  const writer = await requireWriterProfileForUser(userId);
  const [post] = await getDb().insert(writerPosts).values({
    writerId: writer.id,
    content: input.content,
    imageKey: input.imageKey,
    visibility: input.visibility,
    status: input.status,
    publishedAt: input.status === "published" ? new Date() : null,
  }).returning();
  return post;
}

export async function updateStudioPost(userId: string, postId: string, input: z.infer<typeof writerPostInputSchema>) {
  const writer = await requireWriterProfileForUser(userId);
  const [post] = await getDb().update(writerPosts).set({
    content: input.content,
    imageKey: input.imageKey,
    visibility: input.visibility,
    status: input.status,
    publishedAt: input.status === "published" ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(eq(writerPosts.id, postId), eq(writerPosts.writerId, writer.id))).returning();
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "ไม่พบโพสต์นี้");
  return post;
}

export async function archiveStudioPost(userId: string, postId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const [post] = await getDb().update(writerPosts).set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(writerPosts.id, postId), eq(writerPosts.writerId, writer.id))).returning();
  if (!post) throw new ApiError(404, "POST_NOT_FOUND", "ไม่พบโพสต์นี้");
  return { archived: true };
}

export async function listVisibleWriterPosts(userId: string | null, username: string) {
  const [writer] = await getDb().select({ id: writerProfiles.id }).from(writerProfiles)
    .where(and(eq(writerProfiles.username, username.toLowerCase()), eq(writerProfiles.status, "ACTIVE"))).limit(1);
  if (!writer) throw new ApiError(404, "WRITER_NOT_FOUND", "ไม่พบนักเขียนนี้");

  let visibility: ("public" | "followers" | "members")[] = ["public"];
  if (userId) {
    const now = new Date();
    const [follow, membership] = await Promise.all([
      getDb().select({ userId: writerFollows.userId }).from(writerFollows)
        .where(and(eq(writerFollows.userId, userId), eq(writerFollows.writerId, writer.id))).limit(1),
      getDb().select({ id: readerMemberships.id }).from(readerMemberships)
        .where(and(
          eq(readerMemberships.readerId, userId),
          eq(readerMemberships.writerId, writer.id),
          inArray(readerMemberships.status, ["active", "cancel_at_period_end"]),
          lte(readerMemberships.currentPeriodStart, now),
          gt(readerMemberships.currentPeriodEnd, now),
        )).limit(1),
    ]);
    if (follow.length) visibility = [...visibility, "followers"];
    if (membership.length) visibility = [...visibility, "followers", "members"];
  }

  return getDb().select({
    id: writerPosts.id,
    content: writerPosts.content,
    imageKey: writerPosts.imageKey,
    visibility: writerPosts.visibility,
    publishedAt: writerPosts.publishedAt,
  }).from(writerPosts).where(and(
    eq(writerPosts.writerId, writer.id),
    eq(writerPosts.status, "published"),
    eq(writerPosts.moderationState, "active"),
    inArray(writerPosts.visibility, [...new Set(visibility)]),
  )).orderBy(desc(writerPosts.publishedAt), desc(writerPosts.id));
}