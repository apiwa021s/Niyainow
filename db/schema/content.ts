import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import {
  authorRoleEnum,
  chapterAccessModeEnum,
  chapterStatusEnum,
  contentOriginTypeEnum,
  contentRatingEnum,
  novelStatusEnum,
  publicAccessModeEnum,
  publicationStatusEnum,
  storyTypeEnum,
} from "./enums";
import { writerProfiles } from "./identity";
import { contentWarnings, relationshipTypes, storySettings, tropes } from "./taxonomy";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const authors = pgTable(
  "authors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    name: text("name").notNull(),
    nativeName: text("native_name"),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    website: text("website"),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("authors_slug_uidx").on(table.slug),
    index("authors_name_lower_idx").on(sql`lower(${table.name})`),
    check("authors_avatar_key_is_object_key", sql`${table.avatarKey} is null or (${table.avatarKey} !~ '://' and left(${table.avatarKey}, 1) <> '/')`),
    check("authors_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const genres = pgTable(
  "genres",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    thaiName: varchar("thai_name", { length: 160 }),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("genres_slug_uidx").on(table.slug),
    uniqueIndex("genres_name_lower_uidx").on(sql`lower(${table.name})`),
    index("genres_active_order_idx").on(table.isActive, table.sortOrder),
    check("genres_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'`),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    usageCount: integer("usage_count").default(0).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("tags_slug_uidx").on(table.slug),
    uniqueIndex("tags_name_lower_uidx").on(sql`lower(${table.name})`),
    index("tags_active_usage_idx").on(table.isActive, table.usageCount.desc()),
    check("tags_usage_count_nonnegative", sql`${table.usageCount} >= 0`),
    check("tags_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const novels = pgTable(
  "novels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    writerId: uuid("writer_id").references(() => writerProfiles.id, { onDelete: "restrict" }),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: text("title").notNull(),
    tagline: varchar("tagline", { length: 200 }),
    titleOriginal: text("title_original"),
    synopsis: text("synopsis").notNull(),
    synopsisOriginal: text("synopsis_original"),
    coverKey: text("cover_key"),
    bannerKey: text("banner_key"),
    originalLanguage: varchar("original_language", { length: 16 }),
    language: varchar("language", { length: 16 }).default("th").notNull(),
    status: novelStatusEnum("status").default("ONGOING").notNull(),
    publicationStatus: publicationStatusEnum("publication_status").default("DRAFT").notNull(),
    contentRating: contentRatingEnum("content_rating").default("TEEN").notNull(),
    heatLevel: integer("heat_level"),
    storyType: storyTypeEnum("story_type").default("serial").notNull(),
    originType: contentOriginTypeEnum("origin_type").default("original").notNull(),
    rightsHolder: text("rights_holder"),
    rightsNote: text("rights_note"),
    rightsDocumentReference: text("rights_document_reference"),
    rightsConfirmedAt: timestamp("rights_confirmed_at", timestampConfig),
    contentPolicyConfirmedAt: timestamp("content_policy_confirmed_at", timestampConfig),
    isFeatured: boolean("is_featured").default(false).notNull(),
    latestChapterAt: timestamp("latest_chapter_at", timestampConfig),
    scheduledFor: timestamp("scheduled_for", timestampConfig),
    publishedAt: timestamp("published_at", timestampConfig),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", timestampConfig),
  },
  (table) => [
    uniqueIndex("novels_slug_uidx").on(table.slug),
    index("novels_writer_updated_idx").on(table.writerId, table.updatedAt.desc(), table.id),
    index("novels_public_latest_idx").on(table.publicationStatus, table.latestChapterAt.desc(), table.id),
    index("novels_latest_published_idx")
      .on(table.latestChapterAt.desc(), table.id)
      .where(sql`${table.publicationStatus} = 'PUBLISHED' and ${table.deletedAt} is null`),
    index("novels_public_status_idx").on(table.publicationStatus, table.status, table.id),
    index("novels_featured_public_idx").on(table.isFeatured, table.publicationStatus, table.id),
    index("novels_title_lower_idx").on(sql`lower(${table.title})`),
    index("novels_search_idx").using(
      "gin",
      sql`to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.titleOriginal}, ''))`,
    ),
    check("novels_cover_key_is_object_key", sql`${table.coverKey} is null or (${table.coverKey} !~ '://' and left(${table.coverKey}, 1) <> '/')`),
    check("novels_banner_key_is_object_key", sql`${table.bannerKey} is null or (${table.bannerKey} !~ '://' and left(${table.bannerKey}, 1) <> '/')`),
    check("novels_heat_level_range", sql`${table.heatLevel} is null or ${table.heatLevel} between 1 and 5`),
    check(
      "novels_rights_confirmation_valid",
      sql`${table.originType} = 'original' or (${table.rightsConfirmedAt} is not null and length(btrim(coalesce(${table.rightsHolder}, ''))) > 0)`,
    ),
    check(
      "novels_publication_dates_valid",
      sql`(${table.publicationStatus} <> 'PUBLISHED' or ${table.publishedAt} is not null) and (${table.publicationStatus} <> 'SCHEDULED' or ${table.scheduledFor} is not null)`,
    ),
    check("novels_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const novelAlternativeTitles = pgTable(
  "novel_alternative_titles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    language: varchar("language", { length: 16 }),
  },
  (table) => [
    uniqueIndex("novel_alt_titles_novel_title_uidx").on(table.novelId, sql`lower(${table.title})`),
    index("novel_alt_titles_title_lower_idx").on(sql`lower(${table.title})`),
  ],
);

export const novelAuthors = pgTable(
  "novel_authors",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),
    role: authorRoleEnum("role").default("AUTHOR").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_authors_pk", columns: [table.novelId, table.authorId, table.role] }),
    index("novel_authors_author_idx").on(table.authorId, table.role, table.novelId),
  ],
);

export const novelGenres = pgTable(
  "novel_genres",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genres.id, { onDelete: "restrict" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_genres_pk", columns: [table.novelId, table.genreId] }),
    index("novel_genres_genre_novel_idx").on(table.genreId, table.novelId),
    index("novel_genres_novel_order_idx").on(table.novelId, table.sortOrder),
    uniqueIndex("novel_genres_one_primary_uidx")
      .on(table.novelId)
      .where(sql`${table.isPrimary}`),
  ],
);

export const novelTags = pgTable(
  "novel_tags",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "novel_tags_pk", columns: [table.novelId, table.tagId] }),
    index("novel_tags_tag_novel_idx").on(table.tagId, table.novelId),
  ],
);

export const novelRelationships = pgTable(
  "novel_relationships",
  {
    novelId: uuid("novel_id").notNull().references(() => novels.id, { onDelete: "cascade" }),
    relationshipTypeId: uuid("relationship_type_id").notNull().references(() => relationshipTypes.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "novel_relationships_pk", columns: [table.novelId, table.relationshipTypeId] }),
    index("novel_relationships_type_novel_idx").on(table.relationshipTypeId, table.novelId),
  ],
);

export const novelSettings = pgTable(
  "novel_settings",
  {
    novelId: uuid("novel_id").notNull().references(() => novels.id, { onDelete: "cascade" }),
    settingId: uuid("setting_id").notNull().references(() => storySettings.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "novel_settings_pk", columns: [table.novelId, table.settingId] }),
    index("novel_settings_setting_novel_idx").on(table.settingId, table.novelId),
  ],
);

export const novelTropes = pgTable(
  "novel_tropes",
  {
    novelId: uuid("novel_id").notNull().references(() => novels.id, { onDelete: "cascade" }),
    tropeId: uuid("trope_id").notNull().references(() => tropes.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "novel_tropes_pk", columns: [table.novelId, table.tropeId] }),
    index("novel_tropes_trope_novel_idx").on(table.tropeId, table.novelId),
  ],
);

export const novelContentWarnings = pgTable(
  "novel_content_warnings",
  {
    novelId: uuid("novel_id").notNull().references(() => novels.id, { onDelete: "cascade" }),
    contentWarningId: uuid("content_warning_id").notNull().references(() => contentWarnings.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "novel_content_warnings_pk", columns: [table.novelId, table.contentWarningId] }),
    index("novel_content_warnings_warning_novel_idx").on(table.contentWarningId, table.novelId),
  ],
);

/**
 * Denormalized search projection maintained by content write transactions.
 * `pg_trgm` supports Thai/Latin substring search across titles, aliases, authors,
 * genres and tags without coupling callers to the eventual search provider.
 */
export const novelSearchDocuments = pgTable(
  "novel_search_documents",
  {
    novelId: uuid("novel_id")
      .primaryKey()
      .references(() => novels.id, { onDelete: "cascade" }),
    searchText: text("search_text").notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("novel_search_documents_trgm_idx").using("gin", table.searchText.op("gin_trgm_ops")),
    check("novel_search_documents_not_blank", sql`length(btrim(${table.searchText})) > 0`),
  ],
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    chapterNumber: numeric("chapter_number", { precision: 10, scale: 2, mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: text("title").notNull(),
    content: text("content").default("").notNull(),
    excerpt: text("excerpt"),
    wordCount: integer("word_count").default(0).notNull(),
    status: chapterStatusEnum("status").default("DRAFT").notNull(),
    isFree: boolean("is_free").default(true).notNull(),
    accessMode: chapterAccessModeEnum("access_mode").default("free").notNull(),
    coinPrice: integer("coin_price").default(0).notNull(),
    inheritStoryHeatLevel: boolean("inherit_story_heat_level").default(true).notNull(),
    heatLevel: integer("heat_level"),
    inheritStoryWarnings: boolean("inherit_story_warnings").default(true).notNull(),
    memberAvailableAt: timestamp("member_available_at", timestampConfig),
    publicAvailableAt: timestamp("public_available_at", timestampConfig),
    publicAccessModeAfterEarlyAccess: publicAccessModeEnum("public_access_mode_after_early_access"),
    publicCoinPrice: integer("public_coin_price"),
    version: integer("version").default(1).notNull(),
    scheduledFor: timestamp("scheduled_for", timestampConfig),
    publishedAt: timestamp("published_at", timestampConfig),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", timestampConfig),
  },
  (table) => [
    uniqueIndex("chapters_novel_number_uidx").on(table.novelId, table.chapterNumber),
    uniqueIndex("chapters_novel_sort_order_uidx").on(table.novelId, table.sortOrder),
    uniqueIndex("chapters_novel_slug_uidx").on(table.novelId, table.slug),
    unique("chapters_novel_id_unique").on(table.novelId, table.id),
    index("chapters_public_navigation_idx").on(table.novelId, table.status, table.sortOrder),
    index("chapters_published_navigation_idx")
      .on(table.novelId, table.sortOrder)
      .where(sql`${table.status} = 'PUBLISHED' and ${table.deletedAt} is null`),
    index("chapters_admin_updated_idx")
      .on(table.updatedAt.desc(), table.id.desc())
      .where(sql`${table.deletedAt} is null`),
    index("chapters_publication_queue_idx").on(table.status, table.scheduledFor),
    index("chapters_published_at_idx").on(table.status, table.publishedAt.desc()),
    check("chapters_number_nonnegative", sql`${table.chapterNumber} >= 0`),
    check("chapters_sort_order_positive", sql`${table.sortOrder} > 0`),
    check("chapters_word_count_nonnegative", sql`${table.wordCount} >= 0`),
    check("chapters_coin_price_nonnegative", sql`${table.coinPrice} >= 0`),
    check("chapters_version_positive", sql`${table.version} > 0`),
    check("chapters_heat_level_valid", sql`(${table.inheritStoryHeatLevel} and ${table.heatLevel} is null) or (not ${table.inheritStoryHeatLevel} and ${table.heatLevel} between 1 and 5)`),
    check("chapters_warning_override_valid", sql`${table.inheritStoryWarnings} or not ${table.inheritStoryWarnings}`),
    check(
      "chapters_free_price_consistent",
      sql`(${table.accessMode} = 'free' and ${table.isFree} and ${table.coinPrice} = 0)
        or (${table.accessMode} = 'paid' and not ${table.isFree} and ${table.coinPrice} > 0)
        or (${table.accessMode} in ('early_access', 'members_only') and not ${table.isFree} and ${table.coinPrice} = 0)`,
    ),
    check(
      "chapters_early_access_valid",
      sql`(${table.accessMode} <> 'early_access' and ${table.publicAvailableAt} is null and ${table.publicAccessModeAfterEarlyAccess} is null and ${table.publicCoinPrice} is null)
        or (${table.accessMode} = 'early_access' and ${table.publicAvailableAt} is not null and ${table.publicAccessModeAfterEarlyAccess} is not null
          and ((${table.publicAccessModeAfterEarlyAccess} = 'free' and ${table.publicCoinPrice} is null)
            or (${table.publicAccessModeAfterEarlyAccess} = 'paid' and ${table.publicCoinPrice} > 0)))`,
    ),
    check(
      "chapters_publication_dates_valid",
      sql`(${table.status} <> 'PUBLISHED' or ${table.publishedAt} is not null) and (${table.status} <> 'SCHEDULED' or ${table.scheduledFor} is not null)`,
    ),
    check("chapters_published_content_not_blank", sql`${table.status} <> 'PUBLISHED' or length(btrim(${table.content})) > 0`),
    check("chapters_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
  ],
);

export const chapterContentWarnings = pgTable(
  "chapter_content_warnings",
  {
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
    contentWarningId: uuid("content_warning_id").notNull().references(() => contentWarnings.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ name: "chapter_content_warnings_pk", columns: [table.chapterId, table.contentWarningId] }),
    index("chapter_content_warnings_warning_chapter_idx").on(table.contentWarningId, table.chapterId),
  ],
);

/**
 * Mutable, transactionally maintained counters kept out of the editorial row.
 * Publishing updates this row and `novels.latestChapterAt` in the same transaction.
 */
export const novelStatistics = pgTable(
  "novel_statistics",
  {
    novelId: uuid("novel_id")
      .primaryKey()
      .references(() => novels.id, { onDelete: "cascade" }),
    latestChapterId: uuid("latest_chapter_id"),
    totalChapters: integer("total_chapters").default(0).notNull(),
    publishedChapters: integer("published_chapters").default(0).notNull(),
    viewCount: bigint("view_count", { mode: "number" }).default(0).notNull(),
    libraryCount: integer("library_count").default(0).notNull(),
    followerCount: integer("follower_count").default(0).notNull(),
    ratingAverage: numeric("rating_average", { precision: 3, scale: 2, mode: "number" }).default(0).notNull(),
    ratingSum: bigint("rating_sum", { mode: "number" }).default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    reviewCount: integer("review_count").default(0).notNull(),
    latestChapterAt: timestamp("latest_chapter_at", timestampConfig),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    foreignKey({
      name: "novel_statistics_latest_chapter_fk",
      columns: [table.novelId, table.latestChapterId],
      foreignColumns: [chapters.novelId, chapters.id],
    }),
    index("novel_statistics_views_idx").on(table.viewCount.desc(), table.novelId),
    index("novel_statistics_rating_idx").on(table.ratingAverage.desc(), table.ratingCount.desc(), table.novelId),
    check("novel_statistics_total_nonnegative", sql`${table.totalChapters} >= 0 and ${table.publishedChapters} >= 0 and ${table.publishedChapters} <= ${table.totalChapters}`),
    check("novel_statistics_counts_nonnegative", sql`${table.viewCount} >= 0 and ${table.libraryCount} >= 0 and ${table.followerCount} >= 0 and ${table.ratingSum} >= 0 and ${table.ratingCount} >= 0 and ${table.reviewCount} >= 0`),
    check("novel_statistics_rating_range", sql`${table.ratingAverage} >= 0 and ${table.ratingAverage} <= 5`),
    check("novel_statistics_rating_sum_valid", sql`${table.ratingSum} <= ${table.ratingCount} * 5`),
  ],
);

/** Promotional banners rendered on the public home page. Editorial content, not
 * per-novel artwork: `image_key` is an R2 object key of kind BANNER and is
 * tracked by the same media lifecycle as covers. */
export const promoBanners = pgTable(
  "promo_banners",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    imageKey: text("image_key").notNull(),
    linkUrl: text("link_url"),
    ctaLabel: varchar("cta_label", { length: 80 }),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    startsAt: timestamp("starts_at", timestampConfig),
    endsAt: timestamp("ends_at", timestampConfig),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("promo_banners_active_order_idx").on(table.isActive, table.sortOrder, table.id),
    check("promo_banners_image_key_is_object_key", sql`${table.imageKey} !~ '://' and left(${table.imageKey}, 1) <> '/'`),
    // Only same-origin paths or absolute http(s) links may be stored, so the
    // public renderer never emits a javascript:/data: href.
    check("promo_banners_link_url_safe", sql`${table.linkUrl} is null or ${table.linkUrl} ~ '^(/[^/]|https?://)'`),
    check("promo_banners_window_valid", sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.startsAt} < ${table.endsAt}`),
  ],
);

export type PromoBanner = typeof promoBanners.$inferSelect;
export type NewPromoBanner = typeof promoBanners.$inferInsert;

export type Novel = typeof novels.$inferSelect;
export type NewNovel = typeof novels.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
