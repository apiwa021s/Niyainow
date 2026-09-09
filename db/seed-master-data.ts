import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import {
  CONTENT_WARNINGS,
  PRIMARY_GENRES,
  RELATIONSHIP_TYPES,
  STORY_SETTINGS,
  TROPES,
  type MasterItem,
} from "@/lib/studio/master-data";
import { LEGACY_GENRE_REDIRECTS } from "@/lib/domain/genre-taxonomy";

import { closeDbConnection, getDb } from "./index";
import { contentWarnings, genres, membershipBenefits, novelGenres, relationshipTypes, storySettings, tropes } from "./schema";

loadEnvConfig(process.cwd());

type NormalizedMasterTable = typeof contentWarnings | typeof relationshipTypes | typeof storySettings | typeof tropes;
type SeedTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function redirectGenreRelations(tx: SeedTransaction, sourceSlug: string, targetSlug: string) {
  const [source, target] = await Promise.all([
    tx.select({ id: genres.id }).from(genres).where(eq(genres.slug, sourceSlug)).limit(1),
    tx.select({ id: genres.id }).from(genres).where(eq(genres.slug, targetSlug)).limit(1),
  ]);
  if (!source[0] || !target[0]) return 0;
  const sourceId = source[0].id;
  const targetId = target[0].id;

  const relations = await tx
    .select({ novelId: novelGenres.novelId, isPrimary: novelGenres.isPrimary, sortOrder: novelGenres.sortOrder })
    .from(novelGenres)
    .where(eq(novelGenres.genreId, sourceId));
  if (!relations.length) return 0;

  await tx
    .insert(novelGenres)
    .values(relations.map((relation) => ({
      novelId: relation.novelId,
      genreId: targetId,
      isPrimary: false,
      sortOrder: relation.sortOrder,
    })))
    .onConflictDoNothing();

  const primaryNovelIds = relations.filter((relation) => relation.isPrimary).map((relation) => relation.novelId);
  if (primaryNovelIds.length) {
    await tx
      .update(novelGenres)
      .set({ isPrimary: false })
      .where(and(eq(novelGenres.genreId, sourceId), inArray(novelGenres.novelId, primaryNovelIds)));
    await tx
      .update(novelGenres)
      .set({ isPrimary: true, sortOrder: 0 })
      .where(and(eq(novelGenres.genreId, targetId), inArray(novelGenres.novelId, primaryNovelIds)));
  }

  await tx.delete(novelGenres).where(eq(novelGenres.genreId, sourceId));
  return relations.length;
}

async function upsertNormalizedMaster(
  tx: SeedTransaction,
  table: NormalizedMasterTable,
  items: readonly MasterItem[],
) {
  await tx
    .insert(table)
    .values(items.map((item) => ({
      slug: item.slug,
      nameTh: item.nameTh,
      nameEn: item.nameEn,
      descriptionTh: item.descriptionTh,
      descriptionEn: item.descriptionEn,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    })))
    .onConflictDoUpdate({
      target: table.slug,
      set: {
        nameTh: sql`excluded.name_th`,
        nameEn: sql`excluded.name_en`,
        descriptionTh: sql`excluded.description_th`,
        descriptionEn: sql`excluded.description_en`,
        sortOrder: sql`excluded.sort_order`,
        isActive: sql`excluded.is_active`,
        updatedAt: new Date(),
      },
    });
}

export async function seedMasterData() {
  const db = getDb();
  let remappedGenreRelations = 0;
  let removedGenres = 0;
  await db.transaction(async (tx) => {
    await tx
      .insert(genres)
      .values(PRIMARY_GENRES.map((item) => ({
        slug: item.slug,
        name: item.nameEn,
        thaiName: item.nameTh,
        description: item.descriptionTh ?? item.descriptionEn,
        sortOrder: item.sortOrder,
        isActive: item.isActive,
      })))
      .onConflictDoUpdate({
        target: genres.slug,
        set: {
          name: sql`excluded.name`,
          thaiName: sql`excluded.thai_name`,
          description: sql`excluded.description`,
          sortOrder: sql`excluded.sort_order`,
          isActive: sql`excluded.is_active`,
          updatedAt: new Date(),
        },
      });

    for (const [sourceSlug, targetSlug] of Object.entries(LEGACY_GENRE_REDIRECTS)) {
      remappedGenreRelations += await redirectGenreRelations(tx, sourceSlug, targetSlug);
    }

    const standardGenreSlugs = PRIMARY_GENRES.map((item) => item.slug);
    const referencedNonstandardGenres = await tx
      .select({ slug: genres.slug })
      .from(genres)
      .innerJoin(novelGenres, eq(novelGenres.genreId, genres.id))
      .where(notInArray(genres.slug, standardGenreSlugs))
      .groupBy(genres.slug);
    if (referencedNonstandardGenres.length) {
      throw new Error(
        `Cannot remove referenced nonstandard genres without an explicit mapping: ${referencedNonstandardGenres.map((row) => row.slug).join(", ")}`,
      );
    }
    const removed = await tx
      .delete(genres)
      .where(notInArray(genres.slug, standardGenreSlugs))
      .returning({ id: genres.id });
    removedGenres = removed.length;

    await upsertNormalizedMaster(tx, relationshipTypes, RELATIONSHIP_TYPES);
    await upsertNormalizedMaster(tx, storySettings, STORY_SETTINGS);
    await upsertNormalizedMaster(tx, tropes, TROPES);
    await upsertNormalizedMaster(tx, contentWarnings, CONTENT_WARNINGS);
    await tx.insert(membershipBenefits).values([
      { slug: "early_access", nameTh: "อ่านตอนใหม่ก่อน", nameEn: "Early Access", sortOrder: 1 },
      { slug: "member_posts", nameTh: "โพสต์สำหรับสมาชิก", nameEn: "Member Posts", sortOrder: 2 },
      { slug: "bonus_chapters", nameTh: "ตอนพิเศษสำหรับสมาชิก", nameEn: "Bonus Chapters", sortOrder: 3 },
      { slug: "member_badge", nameTh: "ตราสมาชิก", nameEn: "Member Badge", sortOrder: 4 },
    ]).onConflictDoUpdate({
      target: membershipBenefits.slug,
      set: {
        nameTh: sql`excluded.name_th`,
        nameEn: sql`excluded.name_en`,
        sortOrder: sql`excluded.sort_order`,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  });

  return {
    genres: PRIMARY_GENRES.length,
    remappedGenreRelations,
    removedGenres,
    relationships: RELATIONSHIP_TYPES.length,
    settings: STORY_SETTINGS.length,
    tropes: TROPES.length,
    contentWarnings: CONTENT_WARNINGS.length,
    membershipBenefits: 4,
  };
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  seedMasterData()
    .then((summary) => console.info("Master data seed complete", summary))
    .catch((error: unknown) => {
      console.error("Master data seed failed", error);
      process.exitCode = 1;
    })
    .finally(closeDbConnection);
}
