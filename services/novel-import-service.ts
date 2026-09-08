import "server-only";

import { createHash } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  novelImportChapters,
  novelImportChapterTexts,
  novelImportSources,
  novelImportSourceTexts,
} from "@/db/schema";
import type {
  NovelImportChapterBatchInput,
  NovelImportSourceInput,
} from "@/lib/domain/novel-import";
import { ApiError } from "@/lib/http/api-response";

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
    lastSuccessfulChapter: source.lastSuccessfulChapter,
    nextProbeChapter: source.nextProbeChapter,
  };
}

export async function registerNovelImportSource(input: NovelImportSourceInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(novelImportSources).where(and(
      eq(novelImportSources.provider, input.provider),
      eq(novelImportSources.externalWorkId, input.externalWorkId),
    )).limit(1);

    if (existing && existing.status !== "ready") return sourceState(existing);
    if (existing && existing.sourceLanguage !== input.sourceLanguage) {
      throw new ApiError(
        409,
        "SOURCE_LANGUAGE_CONFLICT",
        `Import source is already registered as ${existing.sourceLanguage}`,
      );
    }

    const [source] = existing
      ? await tx.update(novelImportSources).set({
          seedUrl: input.seedUrl,
          metadata: input.metadata,
          updatedAt: new Date(),
        }).where(eq(novelImportSources.id, existing.id)).returning()
      : await tx.insert(novelImportSources).values({
          provider: input.provider,
          externalWorkId: input.externalWorkId,
          importReference: importReference(input.provider, input.externalWorkId),
          seedUrl: input.seedUrl,
          sourceLanguage: input.sourceLanguage,
          metadata: input.metadata,
        }).returning();

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
}

export async function ingestNovelImportChapterBatch(input: NovelImportChapterBatchInput) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [source] = await tx.select().from(novelImportSources).where(and(
      eq(novelImportSources.provider, input.provider),
      eq(novelImportSources.externalWorkId, input.externalWorkId),
    )).limit(1);
    if (!source) throw new ApiError(404, "SOURCE_NOT_FOUND", "Register the import source before sending chapters");
    if (source.status !== "ready") {
      throw new ApiError(403, "SOURCE_NOT_READY", `Import source is ${source.status}`);
    }

    const results: Array<{ chapterNumber: number; action: "created" | "updated" | "unchanged" | "stale" }> = [];
    let highestAcceptedChapter = source.lastSuccessfulChapter ?? 0;

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
      highestAcceptedChapter = Math.max(highestAcceptedChapter, inputChapter.chapterNumber);
      results.push({ chapterNumber: inputChapter.chapterNumber, action });
    }

    const [updatedSource] = await tx.update(novelImportSources).set({
      lastSuccessfulChapter: highestAcceptedChapter || null,
      nextProbeChapter: highestAcceptedChapter + 1,
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
