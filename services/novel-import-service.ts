import "server-only";

import { createHash } from "node:crypto";

import { and, asc, eq, gt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  mediaAssets,
  novelImportChapters,
  novelImportChapterTexts,
  novelImportSources,
  novelImportSourceTexts,
} from "@/db/schema";
import type {
  NovelImportChapterBatchInput,
  NovelImportSourceInput,
} from "@/lib/domain/novel-import";
import { advanceContiguousChapterCheckpoint } from "@/lib/domain/novel-import";
import { EnvironmentConfigurationError } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { ImportedCoverError, uploadImportedCover } from "@/lib/r2/import-cover";

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
  if (error instanceof EnvironmentConfigurationError) return "R2_NOT_CONFIGURED: Media storage is not configured";
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
          fetchedAt: incomingFetchedAt > chapter.fetchedAt ? incomingFetchedAt : chapter.fetchedAt,
          updatedAt: new Date(),
        }).where(eq(novelImportChapters.id, chapter.id)).returning();
      } else {
        [chapter] = await tx.insert(novelImportChapters).values({
          sourceId: source.id,
          chapterNumber: inputChapter.chapterNumber,
          sourceUrl: inputChapter.sourceUrl,
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
