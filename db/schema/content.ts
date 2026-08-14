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
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import {
  authorRoleEnum,
  chapterStatusEnum,
  contentRatingEnum,
  novelStatusEnum,
  publicationStatusEnum,
} from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const MAX_MONGO_SOURCE_ID_LENGTH = 255;

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
    check("genres_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
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
    mongoBookId: varchar("mongo_book_id", { length: MAX_MONGO_SOURCE_ID_LENGTH }),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: text("title").notNull(),
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
    uniqueIndex("novels_mongo_book_id_uidx").on(table.mongoBookId),
    uniqueIndex("novels_slug_uidx").on(table.slug),
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
    check(
      "novels_mongo_book_id_valid",
      sql`${table.mongoBookId} is null or (length(${table.mongoBookId}) > 0 and ${table.mongoBookId} = btrim(${table.mongoBookId}) and ${table.mongoBookId} !~ '[[:cntrl:]]')`,
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
    mongoChapterId: varchar("mongo_chapter_id", { length: MAX_MONGO_SOURCE_ID_LENGTH }),
    chapterNumber: numeric("chapter_number", { precision: 10, scale: 2, mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    title: text("title").notNull(),
    content: text("content").default("").notNull(),
    excerpt: text("excerpt"),
    wordCount: integer("word_count").default(0).notNull(),
    status: chapterStatusEnum("status").default("DRAFT").notNull(),
    isFree: boolean("is_free").default(true).notNull(),
    coinPrice: integer("coin_price").default(0).notNull(),
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
    uniqueIndex("chapters_novel_mongo_chapter_uidx").on(table.novelId, table.mongoChapterId),
    uniqueIndex("chapters_novel_number_uidx").on(table.novelId, table.chapterNumber),
    uniqueIndex("chapters_novel_sort_order_uidx").on(table.novelId, table.sortOrder),
    uniqueIndex("chapters_novel_slug_uidx").on(table.novelId, table.slug),
    uniqueIndex("chapters_novel_id_uidx").on(table.novelId, table.id),
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
    check(
      "chapters_mongo_chapter_id_valid",
      sql`${table.mongoChapterId} is null or (length(${table.mongoChapterId}) > 0 and ${table.mongoChapterId} = btrim(${table.mongoChapterId}) and ${table.mongoChapterId} !~ '[[:cntrl:]]')`,
    ),
    check(
      "chapters_free_price_consistent",
      sql`(${table.isFree} and ${table.coinPrice} = 0) or (not ${table.isFree} and ${table.coinPrice} > 0)`,
    ),
    check(
      "chapters_publication_dates_valid",
      sql`(${table.status} <> 'PUBLISHED' or ${table.publishedAt} is not null) and (${table.status} <> 'SCHEDULED' or ${table.scheduledFor} is not null)`,
    ),
    check("chapters_published_content_not_blank", sql`${table.status} <> 'PUBLISHED' or length(btrim(${table.content})) > 0`),
    check("chapters_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
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
