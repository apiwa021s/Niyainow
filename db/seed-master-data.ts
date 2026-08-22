import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

import {
  CONTENT_WARNINGS,
  PRIMARY_GENRES,
  RELATIONSHIP_TYPES,
  STORY_SETTINGS,
  TROPES,
  type MasterItem,
} from "@/lib/studio/master-data";

import { closeDbConnection, getDb } from "./index";
import { contentWarnings, genres, relationshipTypes, storySettings, tropes } from "./schema";

loadEnvConfig(process.cwd());

type NormalizedMasterTable = typeof contentWarnings | typeof relationshipTypes | typeof storySettings | typeof tropes;

async function upsertNormalizedMaster(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
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

    await upsertNormalizedMaster(tx, relationshipTypes, RELATIONSHIP_TYPES);
    await upsertNormalizedMaster(tx, storySettings, STORY_SETTINGS);
    await upsertNormalizedMaster(tx, tropes, TROPES);
    await upsertNormalizedMaster(tx, contentWarnings, CONTENT_WARNINGS);
  });

  return {
    genres: PRIMARY_GENRES.length,
    relationships: RELATIONSHIP_TYPES.length,
    settings: STORY_SETTINGS.length,
    tropes: TROPES.length,
    contentWarnings: CONTENT_WARNINGS.length,
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