import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { mediaAssets } from "./admin";
import { chapters, novels } from "./content";

const timestampConfig = { mode: "date", withTimezone: true } as const;

/** A private, provider-owned work. It is not public content until linked after review. */
export const novelImportSources = pgTable(
  "novel_import_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: varchar("provider", { length: 64 }).notNull(),
    externalWorkId: varchar("external_work_id", { length: 256 }).notNull(),
    contentFormat: varchar("content_format", { length: 16 }).default("text").notNull(),
    importReference: varchar("import_reference", { length: 384 }).notNull(),
    seedUrl: text("seed_url").notNull(),
    coverSourceUrl: text("cover_source_url"),
    coverKey: text("cover_key"),
    coverStatus: varchar("cover_status", { length: 16 }).default("missing").notNull(),
    coverError: text("cover_error"),
    coverUpdatedAt: timestamp("cover_updated_at", timestampConfig),
    sourceLanguage: varchar("source_language", { length: 35 }).notNull(),
    status: varchar("status", { length: 16 }).default("ready").notNull(),
    blockedReason: text("blocked_reason"),
    linkedNovelId: uuid("linked_novel_id").references(() => novels.id, { onDelete: "set null" }),
    lastSuccessfulChapter: integer("last_successful_chapter"),
    nextProbeChapter: integer("next_probe_chapter").default(1).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("novel_import_sources_provider_work_uidx").on(table.provider, table.externalWorkId),
    uniqueIndex("novel_import_sources_reference_uidx").on(table.importReference),
    index("novel_import_sources_status_updated_idx").on(table.status, table.updatedAt.desc(), table.id),
    index("novel_import_sources_cover_status_idx").on(table.coverStatus, table.updatedAt.desc(), table.id),
    index("novel_import_sources_linked_novel_idx").on(table.linkedNovelId),
    check("novel_import_sources_provider_format", sql`${table.provider} ~ '^[a-z0-9][a-z0-9_-]{0,63}$'`),
    check("novel_import_sources_content_format_valid", sql`${table.contentFormat} in ('text', 'manga')`),
    check("novel_import_sources_work_id_not_blank", sql`length(btrim(${table.externalWorkId})) > 0`),
    check("novel_import_sources_reference_not_blank", sql`length(btrim(${table.importReference})) > 0`),
    check("novel_import_sources_seed_url_http", sql`${table.seedUrl} ~ '^https?://'`),
    check("novel_import_sources_cover_url_https", sql`${table.coverSourceUrl} is null or ${table.coverSourceUrl} ~ '^https://'`),
    check(
      "novel_import_sources_cover_key_valid",
      sql`${table.coverKey} is null or (${table.coverKey} ~ '^covers/[0-9a-f-]+[.](jpg|png|webp|avif)$' and ${table.coverKey} !~ '[.]\.[/]')`,
    ),
    check("novel_import_sources_cover_status_valid", sql`${table.coverStatus} in ('missing', 'pending', 'ready', 'error')`),
    check(
      "novel_import_sources_cover_state_valid",
      sql`(${table.coverStatus} = 'missing' and ${table.coverSourceUrl} is null and ${table.coverKey} is null and ${table.coverError} is null) or (${table.coverStatus} = 'pending' and ${table.coverSourceUrl} is not null and ${table.coverError} is null) or (${table.coverStatus} = 'ready' and ${table.coverSourceUrl} is not null and ${table.coverKey} is not null and ${table.coverError} is null) or (${table.coverStatus} = 'error' and ${table.coverSourceUrl} is not null and ${table.coverError} is not null)`,
    ),
    check("novel_import_sources_language_format", sql`${table.sourceLanguage} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`),
    check("novel_import_sources_status_valid", sql`${table.status} in ('ready', 'paused', 'blocked', 'error')`),
    check(
      "novel_import_sources_block_reason_valid",
      sql`(${table.status} = 'blocked' and length(btrim(coalesce(${table.blockedReason}, ''))) > 0) or (${table.status} <> 'blocked' and ${table.blockedReason} is null)`,
    ),
    check("novel_import_sources_last_chapter_positive", sql`${table.lastSuccessfulChapter} is null or ${table.lastSuccessfulChapter} > 0`),
    check("novel_import_sources_next_probe_positive", sql`${table.nextProbeChapter} > 0`),
  ],
);

/** Titles and synopses can be staged independently for every BCP 47 language. */
export const novelImportSourceTexts = pgTable(
  "novel_import_source_texts",
  {
    sourceId: uuid("source_id")
      .notNull()
      .references(() => novelImportSources.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 35 }).notNull(),
    textKind: varchar("text_kind", { length: 16 }).notNull(),
    translationStatus: varchar("translation_status", { length: 16 }).notNull(),
    title: text("title").notNull(),
    synopsis: text("synopsis"),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_import_source_texts_pk", columns: [table.sourceId, table.language] }),
    index("novel_import_source_texts_language_idx").on(table.language, table.sourceId),
    check("novel_import_source_texts_language_format", sql`${table.language} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`),
    check("novel_import_source_texts_kind_valid", sql`${table.textKind} in ('source', 'translation')`),
    check("novel_import_source_texts_status_valid", sql`${table.translationStatus} in ('source', 'draft', 'reviewed', 'approved')`),
    check(
      "novel_import_source_texts_kind_status_valid",
      sql`(${table.textKind} = 'source' and ${table.translationStatus} = 'source') or (${table.textKind} = 'translation' and ${table.translationStatus} <> 'source')`,
    ),
    check("novel_import_source_texts_title_not_blank", sql`length(btrim(${table.title})) > 0`),
  ],
);

/** Language-neutral chapter identity; localized text lives in the child table. */
export const novelImportChapters = pgTable(
  "novel_import_chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => novelImportSources.id, { onDelete: "cascade" }),
    chapterNumber: integer("chapter_number").notNull(),
    sourceUrl: text("source_url").notNull(),
    originalTitle: text("original_title"),
    linkedChapterId: uuid("linked_chapter_id").references(() => chapters.id, { onDelete: "set null" }),
    fetchedAt: timestamp("fetched_at", timestampConfig).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("novel_import_chapters_source_number_uidx").on(table.sourceId, table.chapterNumber),
    index("novel_import_chapters_source_fetched_idx").on(table.sourceId, table.fetchedAt.desc(), table.id),
    index("novel_import_chapters_linked_chapter_idx").on(table.linkedChapterId),
    check("novel_import_chapters_number_positive", sql`${table.chapterNumber} > 0`),
    check("novel_import_chapters_source_url_http", sql`${table.sourceUrl} ~ '^https?://'`),
    check("novel_import_chapters_title_not_blank", sql`${table.originalTitle} is null or length(btrim(${table.originalTitle})) > 0`),
  ],
);

/** Source and translated chapter bodies are versioned separately per language. */
export const novelImportChapterTexts = pgTable(
  "novel_import_chapter_texts",
  {
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => novelImportChapters.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 35 }).notNull(),
    textKind: varchar("text_kind", { length: 16 }).notNull(),
    translationStatus: varchar("translation_status", { length: 16 }).notNull(),
    title: text("title"),
    content: text("content"),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    version: integer("version").default(1).notNull(),
    fetchedAt: timestamp("fetched_at", timestampConfig).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_import_chapter_texts_pk", columns: [table.chapterId, table.language] }),
    index("novel_import_chapter_texts_language_status_idx").on(table.language, table.translationStatus, table.chapterId),
    check("novel_import_chapter_texts_language_format", sql`${table.language} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`),
    check("novel_import_chapter_texts_kind_valid", sql`${table.textKind} in ('source', 'translation')`),
    check("novel_import_chapter_texts_status_valid", sql`${table.translationStatus} in ('source', 'draft', 'reviewed', 'approved')`),
    check(
      "novel_import_chapter_texts_kind_status_valid",
      sql`(${table.textKind} = 'source' and ${table.translationStatus} = 'source') or (${table.textKind} = 'translation' and ${table.translationStatus} <> 'source')`,
    ),
    check(
      "novel_import_chapter_texts_title_valid",
      sql`${table.title} is null or length(btrim(${table.title})) > 0`,
    ),
    check(
      "novel_import_chapter_texts_content_valid",
      sql`(${table.textKind} = 'source' and length(btrim(coalesce(${table.title}, ''))) > 0 and length(btrim(coalesce(${table.content}, ''))) > 0) or (${table.textKind} = 'translation' and (length(btrim(coalesce(${table.title}, ''))) > 0 or length(btrim(coalesce(${table.content}, ''))) > 0))`,
    ),
    check("novel_import_chapter_texts_hash_format", sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`),
    check("novel_import_chapter_texts_version_positive", sql`${table.version} > 0`),
  ],
);

/** Ordered image assets for a manga chapter. The media row owns upload and verification state. */
export const novelImportMangaPages = pgTable(
  "novel_import_manga_pages",
  {
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => novelImportChapters.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "restrict" }),
    sourceUrl: text("source_url").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 44 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_import_manga_pages_pk", columns: [table.chapterId, table.pageNumber] }),
    uniqueIndex("novel_import_manga_pages_media_uidx").on(table.mediaAssetId),
    index("novel_import_manga_pages_chapter_idx").on(table.chapterId, table.pageNumber),
    check("novel_import_manga_pages_number_positive", sql`${table.pageNumber} > 0`),
    check("novel_import_manga_pages_source_url_https", sql`${table.sourceUrl} ~ '^https://'`),
    check("novel_import_manga_pages_checksum_format", sql`${table.checksumSha256} ~ '^[A-Za-z0-9+/]{43}=$'`),
    check("novel_import_manga_pages_content_type_allowed", sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')`),
    check("novel_import_manga_pages_byte_size_positive", sql`${table.byteSize} > 0`),
  ],
);

export type NovelImportSource = typeof novelImportSources.$inferSelect;
export type NovelImportChapter = typeof novelImportChapters.$inferSelect;
export type NovelImportMangaPage = typeof novelImportMangaPages.$inferSelect;
