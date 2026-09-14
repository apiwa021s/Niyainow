import "server-only";

import { createHash } from "node:crypto";

import { and, asc, eq, gt, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  mediaAssets,
  novelImportChapters,
  novelImportChapterTexts,
  novelImportMangaPages,
  novelImportSources,
  novelImportSourceTexts,
} from "@/db/schema";
import type {
  NovelImportChapterBatchInput,
  NovelImportMangaChapterCompleteInput,
  NovelImportMangaChapterPrepareInput,
  NovelImportSourceInput,
} from "@/lib/domain/novel-import";
import { advanceContiguousChapterCheckpoint } from "@/lib/domain/novel-import";
import { EnvironmentConfigurationError } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { ImportedCoverError, uploadImportedCover } from "@/lib/b2/import-cover";
import { createPresignedUpload, deleteB2Object, verifyUploadedObject } from "@/lib/b2/uploads";

function importReference(provider: string, externalWorkId: string) {
  return `import:${provider}:${externalWorkId}`;
}

function contentHash(title?: string, content?: string) {
  return createHash("sha256").update(title ?? "").update("\0").update(content ?? "").digest("hex");
}

function sourceState(source: typeof novelImportSources.$inferSelect) {
  return {
    sourceId: source.id,
    provider: source.provider,
    externalWorkId: source.externalWorkId,
    contentFormat: source.contentFormat,
    status: source.status,
    blockedReason: source.blockedReason,
    importReference: source.importReference,
    coverStatus: source.coverStatus,
    coverKey: source.coverKey,
    coverError: source.coverError,
    lastSuccessfulChapter: source.lastSuccessfulChapter,
    nextProbeChapter: source.nextProbeChapter,
  };
}

function safeCoverError(error: unknown) {
  if (error instanceof ImportedCoverError) return `${error.code}: ${error.message}`;
  if (error instanceof EnvironmentConfigurationError) return "B2_NOT_CONFIGURED: Media storage is not configured";
  return "COVER_UPLOAD_FAILED: Unexpected cover upload failure";
}

async function syncNovelImportCover(input: {
  sourceId: string;
  provider: string;
  externalWorkId: string;
  title: string;
  coverUrl: string;
}) {
  const db = getDb();
  try {
    const uploaded = await uploadImportedCover({
      sourceId: input.sourceId,
      provider: input.provider,
      externalWorkId: input.externalWorkId,
      sourceUrl: input.coverUrl,
    });
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        objectKey: uploaded.objectKey,
        kind: "COVER",
        status: "READY",
        contentType: uploaded.contentType,
        byteSize: uploaded.byteSize,
        altText: input.title,
        etag: uploaded.etag,
        metadata: {
          source: "novel-import",
          provider: input.provider,
          externalWorkId: input.externalWorkId,
          checksumSha256: uploaded.checksumSha256,
        },
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: mediaAssets.objectKey,
        set: {
          status: "READY",
          contentType: uploaded.contentType,
          byteSize: uploaded.byteSize,
          altText: input.title,
          etag: uploaded.etag,
          metadata: {
            source: "novel-import",
            provider: input.provider,
            externalWorkId: input.externalWorkId,
            checksumSha256: uploaded.checksumSha256,
          },
          updatedAt: now,
          deletedAt: null,
        },
      });
      await tx.update(novelImportSources).set({
        coverKey: uploaded.objectKey,
        coverStatus: "ready",
        coverError: null,
        coverUpdatedAt: now,
        updatedAt: now,
      }).where(and(
        eq(novelImportSources.id, input.sourceId),
        eq(novelImportSources.coverSourceUrl, input.coverUrl),
      ));
    });
  } catch (error) {
    const message = safeCoverError(error);
    await db.update(novelImportSources).set({
      coverStatus: "error",
      coverError: message,
      coverUpdatedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(novelImportSources.id, input.sourceId),
      eq(novelImportSources.coverSourceUrl, input.coverUrl),
    ));
    logger.warn("Novel import cover upload failed", {
      sourceId: input.sourceId,
      provider: input.provider,
      externalWorkId: input.externalWorkId,
      error,
    });
  }
}

export async function registerNovelImportSource(input: NovelImportSourceInput) {
  const db = getDb();
  const staged = await db.transaction(async (tx) => {
    let [source] = await tx.select().from(novelImportSources).where(and(
      eq(novelImportSources.provider, input.provider),
      eq(novelImportSources.externalWorkId, input.externalWorkId),
    )).for("update").limit(1);

    if (!source) {
      [source] = await tx.insert(novelImportSources).values({
        provider: input.provider,
        externalWorkId: input.externalWorkId,
        contentFormat: input.contentFormat,
        importReference: importReference(input.provider, input.externalWorkId),
        seedUrl: input.seedUrl,
        coverSourceUrl: input.coverUrl,
        coverStatus: input.coverUrl ? "pending" : "missing",
        coverUpdatedAt: input.coverUrl ? new Date() : null,
        sourceLanguage: input.sourceLanguage,
        metadata: input.metadata,
      }).onConflictDoNothing({
        target: [novelImportSources.provider, novelImportSources.externalWorkId],
      }).returning();

      // Another importer may have registered the same source between our first
      // read and insert. Lock and reuse that row instead of surfacing a unique
      // constraint error to a retrying client.
      if (!source) {
        [source] = await tx.select().from(novelImportSources).where(and(
          eq(novelImportSources.provider, input.provider),
          eq(novelImportSources.externalWorkId, input.externalWorkId),
        )).for("update").limit(1);
      }
    }

    if (!source) throw new ApiError(409, "SOURCE_REGISTRATION_CONFLICT", "Import source registration conflicted; retry");

    if (source.status !== "ready") return sourceState(source);
    if (source.contentFormat !== input.contentFormat) {
      throw new ApiError(
        409,
        "SOURCE_FORMAT_CONFLICT",
        `Import source is already registered as ${source.contentFormat}`,
      );
    }
    if (source.sourceLanguage !== input.sourceLanguage) {
      throw new ApiError(
        409,
        "SOURCE_LANGUAGE_CONFLICT",
        `Import source is already registered as ${source.sourceLanguage}`,
      );
    }

    const coverNeedsSync = Boolean(input.coverUrl) && (
      source.coverSourceUrl !== input.coverUrl ||
      source.coverStatus !== "ready" ||
      !source.coverKey
    );
    [source] = await tx.update(novelImportSources).set({
      seedUrl: input.seedUrl,
      metadata: input.metadata,
      ...(coverNeedsSync ? {
        coverSourceUrl: input.coverUrl,
        coverStatus: "pending",
        coverError: null,
        coverUpdatedAt: new Date(),
      } : {}),
      updatedAt: new Date(),
    }).where(eq(novelImportSources.id, source.id)).returning();

    await tx.insert(novelImportSourceTexts).values({
      sourceId: source.id,
      language: input.sourceLanguage,
      textKind: "source",
      translationStatus: "source",
      title: input.originalTitle,
      synopsis: input.originalSynopsis,
    }).onConflictDoUpdate({
      target: [novelImportSourceTexts.sourceId, novelImportSourceTexts.language],
      set: {
        textKind: "source",
        translationStatus: "source",
        title: input.originalTitle,
        synopsis: input.originalSynopsis,
        updatedAt: new Date(),
      },
    });

    for (const localization of input.localizations) {
      await tx.insert(novelImportSourceTexts).values({
        sourceId: source.id,
        language: localization.language,
        textKind: "translation",
        translationStatus: localization.status,
        title: localization.title,
        synopsis: localization.synopsis,
      }).onConflictDoUpdate({
        target: [novelImportSourceTexts.sourceId, novelImportSourceTexts.language],
        set: {
          textKind: "translation",
          translationStatus: localization.status,
          title: localization.title,
          synopsis: localization.synopsis,
          updatedAt: new Date(),
        },
      });
    }

    return sourceState(source);
  });

  if (staged.status === "ready" && input.coverUrl && staged.coverStatus !== "ready") {
    await syncNovelImportCover({
      sourceId: staged.sourceId,
      provider: input.provider,
      externalWorkId: input.externalWorkId,
      title: input.originalTitle,
      coverUrl: input.coverUrl,
    });
    const [refreshed] = await db.select().from(novelImportSources)
      .where(eq(novelImportSources.id, staged.sourceId)).limit(1);
    if (refreshed) return sourceState(refreshed);
  }

  return staged;
}

export async function ingestNovelImportChapterBatch(input: NovelImportChapterBatchInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [source] = await tx.select().from(novelImportSources).where(and(
      eq(novelImportSources.provider, input.provider),
      eq(novelImportSources.externalWorkId, input.externalWorkId),
    )).for("update").limit(1);
    if (!source) throw new ApiError(404, "SOURCE_NOT_FOUND", "Register the import source before sending chapters");
    if (source.status !== "ready") {
      throw new ApiError(403, "SOURCE_NOT_READY", `Import source is ${source.status}`);
    }
    if (source.contentFormat !== "text") {
      throw new ApiError(409, "SOURCE_FORMAT_CONFLICT", "Manga sources must use the manga chapter import endpoints");
    }

    const results: Array<{ chapterNumber: number; action: "created" | "updated" | "unchanged" | "stale" }> = [];

    for (const inputChapter of input.chapters) {
      const sourceLanguage = inputChapter.sourceLanguage ?? source.sourceLanguage;
      if (sourceLanguage !== source.sourceLanguage) {
        throw new ApiError(
          409,
          "SOURCE_LANGUAGE_CONFLICT",
          `Chapter ${inputChapter.chapterNumber} language must be ${source.sourceLanguage}`,
        );
      }
      if (inputChapter.translations.some((translation) => translation.language === sourceLanguage)) {
        throw new ApiError(
          400,
          "INVALID_REQUEST",
          `Chapter ${inputChapter.chapterNumber} translation language must differ from its source language`,
        );
      }

      const incomingFetchedAt = new Date(inputChapter.fetchedAt);
      const incomingSourceHash = contentHash(inputChapter.originalTitle, inputChapter.originalText);
      let [chapter] = await tx.select().from(novelImportChapters).where(and(
        eq(novelImportChapters.sourceId, source.id),
        eq(novelImportChapters.chapterNumber, inputChapter.chapterNumber),
      )).limit(1);

      let action: "created" | "updated" | "unchanged" | "stale" = chapter ? "unchanged" : "created";
      if (chapter) {
        const [storedSourceText] = await tx.select().from(novelImportChapterTexts).where(and(
          eq(novelImportChapterTexts.chapterId, chapter.id),
          eq(novelImportChapterTexts.language, sourceLanguage),
        )).limit(1);
        if (storedSourceText && incomingFetchedAt < chapter.fetchedAt && storedSourceText.contentHash !== incomingSourceHash) {
          results.push({ chapterNumber: inputChapter.chapterNumber, action: "stale" });
          continue;
        }

        [chapter] = await tx.update(novelImportChapters).set({
          sourceUrl: inputChapter.sourceUrl,
          originalTitle: inputChapter.originalTitle,
          fetchedAt: incomingFetchedAt > chapter.fetchedAt ? incomingFetchedAt : chapter.fetchedAt,
          updatedAt: new Date(),
        }).where(eq(novelImportChapters.id, chapter.id)).returning();
      } else {
        [chapter] = await tx.insert(novelImportChapters).values({
          sourceId: source.id,
          chapterNumber: inputChapter.chapterNumber,
          sourceUrl: inputChapter.sourceUrl,
          originalTitle: inputChapter.originalTitle,
          fetchedAt: incomingFetchedAt,
        }).returning();
      }

      const upsertText = async (text: {
        language: string;
        textKind: "source" | "translation";
        translationStatus: "source" | "draft" | "reviewed" | "approved";
        title?: string;
        content?: string;
      }) => {
        const hash = contentHash(text.title, text.content);
        const [existingText] = await tx.select().from(novelImportChapterTexts).where(and(
          eq(novelImportChapterTexts.chapterId, chapter.id),
          eq(novelImportChapterTexts.language, text.language),
        )).limit(1);
        if (!existingText) {
          await tx.insert(novelImportChapterTexts).values({
            chapterId: chapter.id,
            ...text,
            content: text.content,
            contentHash: hash,
            fetchedAt: incomingFetchedAt,
          });
          return true;
        }
        if (existingText.contentHash === hash && existingText.translationStatus === text.translationStatus) return false;

        await tx.update(novelImportChapterTexts).set({
          ...text,
          content: text.content,
          contentHash: hash,
          fetchedAt: incomingFetchedAt,
          version: sql`${novelImportChapterTexts.version} + 1`,
          updatedAt: new Date(),
        }).where(and(
          eq(novelImportChapterTexts.chapterId, chapter.id),
          eq(novelImportChapterTexts.language, text.language),
        ));
        return true;
      };

      const sourceChanged = await upsertText({
        language: sourceLanguage,
        textKind: "source",
        translationStatus: "source",
        title: inputChapter.originalTitle,
        content: inputChapter.originalText,
      });
      let translationChanged = false;
      for (const translation of inputChapter.translations) {
        translationChanged = await upsertText({
          language: translation.language,
          textKind: "translation",
          translationStatus: translation.status,
          title: translation.title,
          content: translation.content,
        }) || translationChanged;
      }

      if (action === "unchanged" && (sourceChanged || translationChanged)) action = "updated";
      results.push({ chapterNumber: inputChapter.chapterNumber, action });
    }

    const currentCheckpoint = source.lastSuccessfulChapter ?? 0;
    const stagedAfterCheckpoint = await tx.select({
      chapterNumber: novelImportChapters.chapterNumber,
    }).from(novelImportChapters).innerJoin(
      novelImportChapterTexts,
      and(
        eq(novelImportChapterTexts.chapterId, novelImportChapters.id),
        eq(novelImportChapterTexts.language, source.sourceLanguage),
        eq(novelImportChapterTexts.textKind, "source"),
      ),
    ).where(and(
      eq(novelImportChapters.sourceId, source.id),
      gt(novelImportChapters.chapterNumber, currentCheckpoint),
    )).orderBy(asc(novelImportChapters.chapterNumber));
    const lastSuccessfulChapter = advanceContiguousChapterCheckpoint(
      currentCheckpoint,
      stagedAfterCheckpoint.map(({ chapterNumber }) => chapterNumber),
    );

    const [updatedSource] = await tx.update(novelImportSources).set({
      lastSuccessfulChapter: lastSuccessfulChapter || null,
      nextProbeChapter: lastSuccessfulChapter + 1,
      updatedAt: new Date(),
    }).where(eq(novelImportSources.id, source.id)).returning();

    return {
      sourceId: updatedSource.id,
      provider: updatedSource.provider,
      externalWorkId: updatedSource.externalWorkId,
      status: updatedSource.status,
      chapters: results,
    };
  });
}

function mangaUploadActor(sourceId: string) {
  return { id: sourceId, role: "EDITOR" as const, status: "ACTIVE" as const };
}

async function requireMangaSource(
  provider: string,
  externalWorkId: string,
) {
  const db = getDb();
  const [source] = await db.select().from(novelImportSources).where(and(
    eq(novelImportSources.provider, provider),
    eq(novelImportSources.externalWorkId, externalWorkId),
  )).limit(1);
  if (!source) throw new ApiError(404, "SOURCE_NOT_FOUND", "Register the manga source before sending chapters");
  if (source.status !== "ready") throw new ApiError(403, "SOURCE_NOT_READY", `Import source is ${source.status}`);
  if (source.contentFormat !== "manga") {
    throw new ApiError(409, "SOURCE_FORMAT_CONFLICT", "This import source is not registered as manga");
  }
  return source;
}

export async function prepareNovelImportMangaChapter(input: NovelImportMangaChapterPrepareInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [source] = await tx.select().from(novelImportSources).where(and(
      eq(novelImportSources.provider, input.provider),
      eq(novelImportSources.externalWorkId, input.externalWorkId),
    )).for("update").limit(1);
    if (!source) throw new ApiError(404, "SOURCE_NOT_FOUND", "Register the manga source before sending chapters");
    if (source.status !== "ready") throw new ApiError(403, "SOURCE_NOT_READY", `Import source is ${source.status}`);
    if (source.contentFormat !== "manga") {
      throw new ApiError(409, "SOURCE_FORMAT_CONFLICT", "This import source is not registered as manga");
    }
    const incomingFetchedAt = new Date(input.chapter.fetchedAt);
    let [chapter] = await tx.select().from(novelImportChapters).where(and(
      eq(novelImportChapters.sourceId, source.id),
      eq(novelImportChapters.chapterNumber, input.chapter.chapterNumber),
    )).for("update").limit(1);
    const chapterAction = chapter ? "updated" as const : "created" as const;
    if (chapter && incomingFetchedAt < chapter.fetchedAt) {
      throw new ApiError(409, "STALE_MANGA_CHAPTER", "PenHome already has a newer manga chapter manifest");
    }
    if (chapter) {
      [chapter] = await tx.update(novelImportChapters).set({
        sourceUrl: input.chapter.sourceUrl,
        originalTitle: input.chapter.originalTitle,
        fetchedAt: incomingFetchedAt,
        updatedAt: new Date(),
      }).where(eq(novelImportChapters.id, chapter.id)).returning();
    } else {
      [chapter] = await tx.insert(novelImportChapters).values({
        sourceId: source.id,
        chapterNumber: input.chapter.chapterNumber,
        sourceUrl: input.chapter.sourceUrl,
        originalTitle: input.chapter.originalTitle,
        fetchedAt: incomingFetchedAt,
      }).returning();
    }

    const pageNumbers = input.chapter.pages.map(({ pageNumber }) => pageNumber);
    const obsoletePages = await tx.select({ mediaAssetId: novelImportMangaPages.mediaAssetId })
      .from(novelImportMangaPages)
      .where(and(
        eq(novelImportMangaPages.chapterId, chapter.id),
        notInArray(novelImportMangaPages.pageNumber, pageNumbers),
      ));
    if (obsoletePages.length) {
      await tx.delete(novelImportMangaPages).where(and(
        eq(novelImportMangaPages.chapterId, chapter.id),
        notInArray(novelImportMangaPages.pageNumber, pageNumbers),
      ));
      await tx.update(mediaAssets).set({ status: "ORPHANED", updatedAt: new Date() })
        .where(inArray(mediaAssets.id, obsoletePages.map(({ mediaAssetId }) => mediaAssetId)));
    }

    const existingPages = await tx.select({
      pageNumber: novelImportMangaPages.pageNumber,
      mediaAssetId: novelImportMangaPages.mediaAssetId,
      checksumSha256: novelImportMangaPages.checksumSha256,
      contentType: novelImportMangaPages.contentType,
      byteSize: novelImportMangaPages.byteSize,
      objectKey: mediaAssets.objectKey,
      mediaStatus: mediaAssets.status,
    }).from(novelImportMangaPages).innerJoin(
      mediaAssets,
      eq(mediaAssets.id, novelImportMangaPages.mediaAssetId),
    ).where(eq(novelImportMangaPages.chapterId, chapter.id));
    const existingByPage = new Map(existingPages.map((page) => [page.pageNumber, page]));
    const pages = [] as Array<{
      pageNumber: number;
      objectKey: string;
      status: "ready" | "upload";
      uploadUrl?: string;
      expiresAt?: Date;
      requiredHeaders?: Record<string, string>;
    }>;

    for (const page of input.chapter.pages) {
      const checksumSha256 = page.upload.checksumSha256!;
      const existing = existingByPage.get(page.pageNumber);
      if (existing
        && existing.mediaStatus === "READY"
        && existing.checksumSha256 === checksumSha256
        && existing.contentType === page.upload.contentType
        && existing.byteSize === page.upload.contentLength) {
        await tx.update(novelImportMangaPages).set({
          sourceUrl: page.sourceUrl,
          updatedAt: new Date(),
        }).where(and(
          eq(novelImportMangaPages.chapterId, chapter.id),
          eq(novelImportMangaPages.pageNumber, page.pageNumber),
        ));
        pages.push({ pageNumber: page.pageNumber, objectKey: existing.objectKey, status: "ready" });
        continue;
      }

      const signed = await createPresignedUpload({
        actor: mangaUploadActor(source.id),
        upload: page.upload,
      });
      const [asset] = await tx.insert(mediaAssets).values({
        objectKey: signed.objectKey,
        stagingKey: signed.stagingObjectKey,
        kind: "NOVEL_ASSET",
        status: "PENDING",
        contentType: page.upload.contentType,
        byteSize: page.upload.contentLength,
        altText: `${input.chapter.originalTitle} - page ${page.pageNumber}`,
        metadata: {
          source: "novel-import",
          provider: input.provider,
          externalWorkId: input.externalWorkId,
          chapterNumber: input.chapter.chapterNumber,
          pageNumber: page.pageNumber,
          originalFileName: page.upload.originalFileName,
          checksumSha256,
        },
      }).returning();
      if (existing) {
        await tx.update(novelImportMangaPages).set({
          mediaAssetId: asset.id,
          sourceUrl: page.sourceUrl,
          checksumSha256,
          contentType: page.upload.contentType,
          byteSize: page.upload.contentLength,
          updatedAt: new Date(),
        }).where(and(
          eq(novelImportMangaPages.chapterId, chapter.id),
          eq(novelImportMangaPages.pageNumber, page.pageNumber),
        ));
        await tx.update(mediaAssets).set({ status: "ORPHANED", updatedAt: new Date() })
          .where(eq(mediaAssets.id, existing.mediaAssetId));
      } else {
        await tx.insert(novelImportMangaPages).values({
          chapterId: chapter.id,
          pageNumber: page.pageNumber,
          mediaAssetId: asset.id,
          sourceUrl: page.sourceUrl,
          checksumSha256,
          contentType: page.upload.contentType,
          byteSize: page.upload.contentLength,
        });
      }
      pages.push({
        pageNumber: page.pageNumber,
        objectKey: signed.objectKey,
        status: "upload",
        uploadUrl: signed.uploadUrl,
        expiresAt: signed.expiresAt,
        requiredHeaders: signed.requiredHeaders,
      });
    }

    return {
      sourceId: source.id,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      action: pages.every(({ status }) => status === "ready") ? "unchanged" as const : chapterAction,
      pages,
    };
  });
}

export async function completeNovelImportMangaChapter(input: NovelImportMangaChapterCompleteInput) {
  const db = getDb();
  const source = await requireMangaSource(input.provider, input.externalWorkId);
  const [chapter] = await db.select().from(novelImportChapters).where(and(
    eq(novelImportChapters.sourceId, source.id),
    eq(novelImportChapters.chapterNumber, input.chapterNumber),
  )).limit(1);
  if (!chapter) throw new ApiError(404, "CHAPTER_NOT_FOUND", "Prepare the manga chapter before completing its uploads");

  const storedPages = await db.select({
    pageNumber: novelImportMangaPages.pageNumber,
    checksumSha256: novelImportMangaPages.checksumSha256,
    contentType: novelImportMangaPages.contentType,
    byteSize: novelImportMangaPages.byteSize,
    mediaAssetId: novelImportMangaPages.mediaAssetId,
    objectKey: mediaAssets.objectKey,
    stagingKey: mediaAssets.stagingKey,
    mediaStatus: mediaAssets.status,
  }).from(novelImportMangaPages).innerJoin(
    mediaAssets,
    eq(mediaAssets.id, novelImportMangaPages.mediaAssetId),
  ).where(eq(novelImportMangaPages.chapterId, chapter.id)).orderBy(asc(novelImportMangaPages.pageNumber));
  if (storedPages.length !== input.pages.length) {
    throw new ApiError(409, "MANGA_MANIFEST_CONFLICT", "Completed page list does not match the prepared manga manifest");
  }
  const inputByPage = new Map(input.pages.map((page) => [page.pageNumber, page]));

  for (const storedPage of storedPages) {
    const completedPage = inputByPage.get(storedPage.pageNumber);
    if (!completedPage
      || completedPage.objectKey !== storedPage.objectKey
      || completedPage.contentType !== storedPage.contentType
      || completedPage.contentLength !== storedPage.byteSize) {
      throw new ApiError(409, "MANGA_MANIFEST_CONFLICT", `Manga page ${storedPage.pageNumber} does not match its prepared upload`);
    }
    if (storedPage.mediaStatus === "READY") continue;
    if (storedPage.mediaStatus !== "PENDING" || !storedPage.stagingKey) {
      throw new ApiError(409, "MEDIA_STATE_INVALID", `Manga page ${storedPage.pageNumber} is not ready for verification`);
    }
    const [claimed] = await db.update(mediaAssets).set({ status: "VERIFYING", updatedAt: new Date() }).where(and(
      eq(mediaAssets.id, storedPage.mediaAssetId),
      eq(mediaAssets.status, "PENDING"),
    )).returning({ id: mediaAssets.id });
    if (!claimed) throw new ApiError(409, "MEDIA_STATE_INVALID", `Manga page ${storedPage.pageNumber} is already being verified`);

    try {
      const verified = await verifyUploadedObject({
        actor: mangaUploadActor(source.id),
        stagingObjectKey: storedPage.stagingKey,
        finalObjectKey: storedPage.objectKey,
        expectedContentType: completedPage.contentType,
        expectedContentLength: completedPage.contentLength,
        expectedChecksumSha256: storedPage.checksumSha256,
      });
      await db.update(mediaAssets).set({
        status: "READY",
        stagingKey: verified.stagingDeleted ? null : storedPage.stagingKey,
        etag: verified.etag,
        updatedAt: new Date(),
      }).where(and(eq(mediaAssets.id, storedPage.mediaAssetId), eq(mediaAssets.status, "VERIFYING")));
    } catch (error) {
      await db.update(mediaAssets).set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(mediaAssets.id, storedPage.mediaAssetId));
      try { await deleteB2Object(storedPage.stagingKey); } catch { /* Cleanup remains best effort. */ }
      throw error;
    }
  }

  const stagedChapters = await db.select({
    chapterNumber: novelImportChapters.chapterNumber,
    mediaStatus: mediaAssets.status,
  }).from(novelImportChapters).innerJoin(
    novelImportMangaPages,
    eq(novelImportMangaPages.chapterId, novelImportChapters.id),
  ).innerJoin(
    mediaAssets,
    eq(mediaAssets.id, novelImportMangaPages.mediaAssetId),
  ).where(eq(novelImportChapters.sourceId, source.id));
  const readiness = new Map<number, boolean>();
  for (const row of stagedChapters) {
    readiness.set(row.chapterNumber, (readiness.get(row.chapterNumber) ?? true) && row.mediaStatus === "READY");
  }
  const currentCheckpoint = source.lastSuccessfulChapter ?? 0;
  const lastSuccessfulChapter = advanceContiguousChapterCheckpoint(
    currentCheckpoint,
    [...readiness].filter(([, ready]) => ready).map(([chapterNumber]) => chapterNumber),
  );
  await db.update(novelImportSources).set({
    lastSuccessfulChapter: lastSuccessfulChapter || null,
    nextProbeChapter: lastSuccessfulChapter + 1,
    updatedAt: new Date(),
  }).where(eq(novelImportSources.id, source.id));

  return {
    sourceId: source.id,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    pages: storedPages.length,
    status: "ready" as const,
    lastSuccessfulChapter: lastSuccessfulChapter || null,
    nextProbeChapter: lastSuccessfulChapter + 1,
  };
}
