import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { mediaAssets, readerActivityEvents, users } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { READER_AVATAR_MAX_BYTES } from "@/lib/profile/reader-avatar";
import { deleteB2Object, verifyUploadedObject } from "@/lib/b2";
import { assetUrl } from "@/lib/site-config";
import type { AllowedImageType } from "@/lib/validation/upload";

type CompleteReaderAvatarInput = {
  objectKey: string;
  contentType: AllowedImageType;
  contentLength: number;
};

export async function getReaderAvatar(userId: string) {
  const [reader] = await getDb().select({
    avatarKey: users.avatarKey,
    providerImage: users.image,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!reader) throw new ApiError(404, "USER_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

  return {
    avatarUrl: reader.avatarKey ? assetUrl(reader.avatarKey) : reader.providerImage,
    providerImageUrl: reader.providerImage,
    hasCustomAvatar: Boolean(reader.avatarKey),
  };
}

export async function completeReaderAvatarUpload(userId: string, input: CompleteReaderAvatarInput) {
  const db = getDb();
  const [asset] = await db.select().from(mediaAssets).where(and(
    eq(mediaAssets.objectKey, input.objectKey),
    eq(mediaAssets.createdBy, userId),
    eq(mediaAssets.kind, "AVATAR"),
    isNull(mediaAssets.deletedAt),
  )).limit(1);
  if (!asset) throw new ApiError(404, "AVATAR_UPLOAD_NOT_FOUND", "ไม่พบรายการอัปโหลดรูปโปรไฟล์");
  if (asset.contentType !== input.contentType || asset.byteSize !== input.contentLength) {
    throw new ApiError(400, "AVATAR_UPLOAD_MISMATCH", "ไฟล์ไม่ตรงกับรายการอัปโหลด");
  }
  if (asset.byteSize > READER_AVATAR_MAX_BYTES) {
    throw new ApiError(413, "AVATAR_TOO_LARGE", "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB");
  }

  if (asset.status === "READY") {
    // Completion requests are retryable. Never let a retry for an older READY
    // object replace an avatar that the reader uploaded more recently.
    return { ...(await getReaderAvatar(userId)), objectKey: asset.objectKey, cleanupObjectKey: null };
  }
  if (asset.status !== "PENDING" || !asset.stagingKey) {
    throw new ApiError(409, "AVATAR_UPLOAD_STATE_INVALID", "รายการอัปโหลดไม่พร้อมตรวจสอบ");
  }

  const [claimed] = await db.update(mediaAssets).set({
    status: "VERIFYING",
    updatedAt: new Date(),
  }).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.status, "PENDING"))).returning({ id: mediaAssets.id });
  if (!claimed) throw new ApiError(409, "AVATAR_UPLOAD_IN_PROGRESS", "กำลังตรวจสอบรูปโปรไฟล์นี้อยู่");

  let finalObjectCreated = false;
  try {
    const verified = await verifyUploadedObject({
      actor: { id: userId, role: "READER", status: "ACTIVE" },
      stagingObjectKey: asset.stagingKey,
      finalObjectKey: asset.objectKey,
      expectedContentType: input.contentType,
      expectedContentLength: input.contentLength,
      expectedChecksumSha256: asset.metadata.checksumSha256,
    });
    finalObjectCreated = true;
    const now = new Date();
    const previousAvatar = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:profile-avatar`}, 0))`);
      const [reader] = await tx.select({ avatarKey: users.avatarKey, providerImage: users.image })
        .from(users).where(eq(users.id, userId)).limit(1);
      if (!reader) throw new ApiError(404, "USER_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");

      await tx.update(mediaAssets).set({
        status: "READY",
        stagingKey: verified.stagingDeleted ? null : asset.stagingKey,
        etag: verified.etag,
        updatedAt: now,
      }).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.status, "VERIFYING")));
      await tx.update(users).set({ avatarKey: asset.objectKey, updatedAt: now }).where(eq(users.id, userId));

      if (reader.avatarKey && reader.avatarKey !== asset.objectKey) {
        await tx.update(mediaAssets).set({ deletedAt: now, updatedAt: now }).where(and(
          eq(mediaAssets.objectKey, reader.avatarKey),
          eq(mediaAssets.createdBy, userId),
          eq(mediaAssets.kind, "AVATAR"),
          isNull(mediaAssets.deletedAt),
        ));
      }

      await tx.insert(readerActivityEvents).values({
        userId,
        eventType: "profile.avatar_updated",
        readerExpDelta: 0,
        idempotencyKey: `profile-avatar:${asset.objectKey}`,
        metadata: { objectKey: asset.objectKey, previousAvatarKey: reader.avatarKey },
        occurredAt: now,
      }).onConflictDoNothing({
        target: [readerActivityEvents.userId, readerActivityEvents.idempotencyKey],
      });
      return { avatarKey: reader.avatarKey, providerImage: reader.providerImage };
    });

    return {
      avatarUrl: assetUrl(asset.objectKey),
      providerImageUrl: previousAvatar.providerImage,
      hasCustomAvatar: true,
      objectKey: asset.objectKey,
      cleanupObjectKey: previousAvatar.avatarKey && previousAvatar.avatarKey !== asset.objectKey
        ? previousAvatar.avatarKey
        : null,
    };
  } catch (error) {
    await db.update(mediaAssets).set({ status: "FAILED", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    const cleanupKeys = [asset.stagingKey, finalObjectCreated ? asset.objectKey : null].filter(
      (key): key is string => Boolean(key),
    );
    await Promise.allSettled(cleanupKeys.map(deleteB2Object));
    throw error;
  }
}

export async function removeReaderAvatar(userId: string) {
  const db = getDb();
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:profile-avatar`}, 0))`);
    const [reader] = await tx.select({ avatarKey: users.avatarKey, providerImage: users.image })
      .from(users).where(eq(users.id, userId)).limit(1);
    if (!reader) throw new ApiError(404, "USER_NOT_FOUND", "ไม่พบบัญชีผู้ใช้");
    if (!reader.avatarKey) {
      return { avatarUrl: reader.providerImage, providerImageUrl: reader.providerImage, hasCustomAvatar: false, cleanupObjectKey: null };
    }

    await tx.update(users).set({ avatarKey: null, updatedAt: now }).where(eq(users.id, userId));
    await tx.update(mediaAssets).set({ deletedAt: now, updatedAt: now }).where(and(
      eq(mediaAssets.objectKey, reader.avatarKey),
      eq(mediaAssets.createdBy, userId),
      eq(mediaAssets.kind, "AVATAR"),
      isNull(mediaAssets.deletedAt),
    ));
    await tx.insert(readerActivityEvents).values({
      userId,
      eventType: "profile.avatar_removed",
      readerExpDelta: 0,
      idempotencyKey: `profile-avatar-removed:${reader.avatarKey}`,
      metadata: { objectKey: reader.avatarKey },
      occurredAt: now,
    }).onConflictDoNothing({
      target: [readerActivityEvents.userId, readerActivityEvents.idempotencyKey],
    });

    return {
      avatarUrl: reader.providerImage,
      providerImageUrl: reader.providerImage,
      hasCustomAvatar: false,
      cleanupObjectKey: reader.avatarKey,
    };
  });
  return result;
}
