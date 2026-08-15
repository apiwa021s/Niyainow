import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { sql } from "drizzle-orm";

import { chapters as mockChapters, genres as mockGenres, novels as mockNovels, popularTags } from "@/data/mock-data";
import { logger } from "@/lib/logger";
import { slugify, withSlugSuffix } from "@/lib/validation/slug";

import { closeDbConnection, getDb } from "./index";
import { assertDevelopmentSeedAllowed } from "./seed-policy";
import {
  authors,
  chapters,
  genres,
  novelAuthors,
  novelGenres,
  novelSearchDocuments,
  novelStatistics,
  novelTags,
  novels,
  siteSettings,
  tags,
} from "./schema";

function uniqueSlugMap(values: readonly string[], fallbackPrefix: string) {
  const used = new Set<string>();
  const result = new Map<string, string>();

  for (const value of values) {
    const base = slugify(value, fallbackPrefix);
    let slug = base;
    let suffix = 2;
    while (used.has(slug)) {
      slug = withSlugSuffix(base, suffix);
      suffix += 1;
    }
    used.add(slug);
    result.set(value, slug);
  }

  return result;
}

function countWords(content: string) {
  return content.trim() ? content.trim().split(/\s+/u).length : 0;
}

const storyStatus = {
  ongoing: "ONGOING",
  completed: "COMPLETED",
  hiatus: "HIATUS",
} as const;

export async function seedDevelopmentData() {
  assertDevelopmentSeedAllowed();

  const db = getDb();
  const now = new Date();
  const allTagNames = [...new Set([...popularTags, ...mockNovels.flatMap((novel) => novel.tags)])];
  const authorNames = [...new Set(mockNovels.map((novel) => novel.author))];
  const tagSlugs = uniqueSlugMap(allTagNames, "tag");
  const authorSlugs = uniqueSlugMap(authorNames, "author");

  const summary = await db.transaction(async (tx) => {
    const seededGenres = await tx
      .insert(genres)
      .values(
        mockGenres.map((genre, index) => ({
          slug: genre.slug,
          name: genre.name,
          thaiName: genre.thaiName,
          description: genre.description,
          sortOrder: index + 1,
          isActive: true,
        })),
      )
      .onConflictDoUpdate({
        target: genres.slug,
        set: {
          name: sql`excluded.name`,
          thaiName: sql`excluded.thai_name`,
          description: sql`excluded.description`,
          sortOrder: sql`excluded.sort_order`,
          isActive: true,
          updatedAt: now,
        },
      })
      .returning({ id: genres.id, slug: genres.slug, name: genres.name });

    const tagUseCount = new Map<string, number>();
    for (const novel of mockNovels) {
      for (const tag of novel.tags) tagUseCount.set(tag, (tagUseCount.get(tag) ?? 0) + 1);
    }

    const seededTags = await tx
      .insert(tags)
      .values(
        allTagNames.map((name) => ({
          slug: tagSlugs.get(name)!,
          name,
          usageCount: tagUseCount.get(name) ?? 0,
        })),
      )
      .onConflictDoUpdate({
        target: tags.slug,
        set: {
          name: sql`excluded.name`,
          usageCount: sql`excluded.usage_count`,
          isActive: true,
          updatedAt: now,
        },
      })
      .returning({ id: tags.id, slug: tags.slug, name: tags.name });

    const seededAuthors = await tx
      .insert(authors)
      .values(authorNames.map((name) => ({ name, slug: authorSlugs.get(name)! })))
      .onConflictDoUpdate({
        target: authors.slug,
        set: { name: sql`excluded.name`, updatedAt: now },
      })
      .returning({ id: authors.id, name: authors.name, slug: authors.slug });

    const seededNovels = await tx
      .insert(novels)
      .values(
        mockNovels.map((novel) => ({
          slug: novel.slug,
          title: novel.thaiTitle,
          titleOriginal: novel.title,
          synopsis: novel.synopsis,
          language: "th",
          status: storyStatus[novel.status],
          publicationStatus: "PUBLISHED" as const,
          contentRating: "TEEN" as const,
          isFeatured: novel.featured ?? false,
          latestChapterAt: now,
          publishedAt: now,
          // Mock image URLs are intentionally not copied. Media columns only hold R2 keys.
          coverKey: null,
          bannerKey: null,
        })),
      )
      .onConflictDoUpdate({
        target: novels.slug,
        set: {
          title: sql`excluded.title`,
          titleOriginal: sql`excluded.title_original`,
          synopsis: sql`excluded.synopsis`,
          status: sql`excluded.status`,
          publicationStatus: "PUBLISHED",
          isFeatured: sql`excluded.is_featured`,
          latestChapterAt: now,
          publishedAt: sql`coalesce(${novels.publishedAt}, excluded.published_at)`,
          updatedAt: now,
        },
      })
      .returning({ id: novels.id, slug: novels.slug });

    const genreBySlug = new Map(seededGenres.map((genre) => [genre.slug, genre]));
    const tagByName = new Map(seededTags.map((tag) => [tag.name, tag]));
    const authorByName = new Map(seededAuthors.map((author) => [author.name, author]));
    const novelBySlug = new Map(seededNovels.map((novel) => [novel.slug, novel]));

    await tx
      .insert(novelAuthors)
      .values(
        mockNovels.map((novel) => ({
          novelId: novelBySlug.get(novel.slug)!.id,
          authorId: authorByName.get(novel.author)!.id,
          role: "AUTHOR" as const,
          sortOrder: 1,
        })),
      )
      .onConflictDoNothing();

    await tx
      .insert(novelGenres)
      .values(
        mockNovels.flatMap((novel) =>
          novel.genres.map((genreSlug, index) => ({
            novelId: novelBySlug.get(novel.slug)!.id,
            genreId: genreBySlug.get(genreSlug)!.id,
            isPrimary: index === 0,
            sortOrder: index + 1,
          })),
        ),
      )
      .onConflictDoNothing();

    await tx
      .insert(novelTags)
      .values(
        mockNovels.flatMap((novel) =>
          novel.tags.map((tag) => ({
            novelId: novelBySlug.get(novel.slug)!.id,
            tagId: tagByName.get(tag)!.id,
          })),
        ),
      )
      .onConflictDoNothing();

    const nextSortOrder = new Map<string, number>();
    const chapterRows = mockChapters.map((chapter) => {
      const sortOrder = (nextSortOrder.get(chapter.novelSlug) ?? 0) + 1;
      nextSortOrder.set(chapter.novelSlug, sortOrder);
      const content = chapter.body.join("\n\n");
      const isFree = !(chapter.locked ?? false);

      return {
        novelId: novelBySlug.get(chapter.novelSlug)!.id,
        chapterNumber: chapter.number,
        sortOrder,
        slug: `chapter-${String(chapter.number).replace(".", "-")}`,
        title: chapter.title,
        content,
        wordCount: countWords(content),
        status: "PUBLISHED" as const,
        isFree,
        coinPrice: isFree ? 0 : (chapter.coinPrice ?? 15),
        publishedAt: now,
      };
    });

    const seededChapters = await tx
      .insert(chapters)
      .values(chapterRows)
      .onConflictDoUpdate({
        target: [chapters.novelId, chapters.chapterNumber],
        set: {
          sortOrder: sql`excluded.sort_order`,
          slug: sql`excluded.slug`,
          title: sql`excluded.title`,
          content: sql`excluded.content`,
          wordCount: sql`excluded.word_count`,
          status: "PUBLISHED",
          isFree: sql`excluded.is_free`,
          coinPrice: sql`excluded.coin_price`,
          publishedAt: sql`coalesce(${chapters.publishedAt}, excluded.published_at)`,
          updatedAt: now,
        },
      })
      .returning({ id: chapters.id, novelId: chapters.novelId, sortOrder: chapters.sortOrder });

    const chaptersByNovel = new Map<string, typeof seededChapters>();
    for (const chapter of seededChapters) {
      const list = chaptersByNovel.get(chapter.novelId) ?? [];
      list.push(chapter);
      chaptersByNovel.set(chapter.novelId, list);
    }

    await tx
      .insert(novelStatistics)
      .values(
        mockNovels.map((mockNovel) => {
          const novel = novelBySlug.get(mockNovel.slug)!;
          const novelChapters = chaptersByNovel.get(novel.id) ?? [];
          const latestChapter = novelChapters.toSorted((a, b) => b.sortOrder - a.sortOrder)[0];
          return {
            novelId: novel.id,
            latestChapterId: latestChapter?.id,
            totalChapters: novelChapters.length,
            publishedChapters: novelChapters.length,
            viewCount: mockNovel.views,
            latestChapterAt: now,
          };
        }),
      )
      .onConflictDoUpdate({
        target: novelStatistics.novelId,
        set: {
          latestChapterId: sql`excluded.latest_chapter_id`,
          totalChapters: sql`excluded.total_chapters`,
          publishedChapters: sql`excluded.published_chapters`,
          viewCount: sql`excluded.view_count`,
          latestChapterAt: now,
          updatedAt: now,
        },
      });

    await tx
      .insert(novelSearchDocuments)
      .values(
        mockNovels.map((novel) => ({
          novelId: novelBySlug.get(novel.slug)!.id,
          searchText: [novel.thaiTitle, novel.title, novel.author, ...novel.genres, ...novel.tags].join(" "),
        })),
      )
      .onConflictDoUpdate({
        target: novelSearchDocuments.novelId,
        set: { searchText: sql`excluded.search_text`, updatedAt: now },
      });

    await tx
      .insert(siteSettings)
      .values([
        { key: "site.name", value: "NiyaiThai", description: "Public brand name", isPublic: true },
        { key: "site.default_locale", value: "th", description: "Default content locale", isPublic: true },
      ])
      .onConflictDoNothing();

    return {
      genres: seededGenres.length,
      tags: seededTags.length,
      authors: seededAuthors.length,
      novels: seededNovels.length,
      chapters: seededChapters.length,
    };
  });

  logger.info("Development data seed complete", summary);
  return summary;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  seedDevelopmentData()
    .catch((error: unknown) => {
      logger.error("Development data seed failed", { error });
      process.exitCode = 1;
    })
    .finally(closeDbConnection);
}
