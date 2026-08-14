import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { chapters, novels } from "./content";
import { libraryStatusEnum, reviewStatusEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const userLibrary = pgTable(
  "user_library",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    status: libraryStatusEnum("status").default("PLAN_TO_READ").notNull(),
    addedAt: timestamp("added_at", timestampConfig).defaultNow().notNull(),
    startedAt: timestamp("started_at", timestampConfig),
    completedAt: timestamp("completed_at", timestampConfig),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "user_library_pk", columns: [table.userId, table.novelId] }),
    index("user_library_user_status_updated_idx").on(table.userId, table.status, table.updatedAt.desc(), table.novelId),
    index("user_library_novel_status_idx").on(table.novelId, table.status),
    check(
      "user_library_completed_date_valid",
      sql`(${table.status} <> 'COMPLETED') or (${table.completedAt} is not null)`,
    ),
  ],
);

export const novelFollows = pgTable(
  "novel_follows",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
    followedAt: timestamp("followed_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_follows_pk", columns: [table.userId, table.novelId] }),
    index("novel_follows_user_date_idx").on(table.userId, table.followedAt.desc(), table.novelId),
    index("novel_follows_novel_idx").on(table.novelId, table.userId),
  ],
);

/** One throttled/upserted row per user and novel; never append on scroll. */
export const readingProgress = pgTable(
  "reading_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").notNull(),
    progressPercent: numeric("progress_percent", { precision: 5, scale: 2, mode: "number" }).default(0).notNull(),
    position: integer("position").default(0).notNull(),
    completed: boolean("completed").default(false).notNull(),
    lastReadAt: timestamp("last_read_at", timestampConfig).defaultNow().notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "reading_progress_pk", columns: [table.userId, table.novelId] }),
    foreignKey({
      name: "reading_progress_novel_chapter_fk",
      columns: [table.novelId, table.chapterId],
      foreignColumns: [chapters.novelId, chapters.id],
    }).onDelete("cascade"),
    index("reading_progress_user_recent_idx").on(table.userId, table.lastReadAt.desc(), table.novelId),
    index("reading_progress_chapter_idx").on(table.chapterId),
    check("reading_progress_percent_range", sql`${table.progressPercent} >= 0 and ${table.progressPercent} <= 100`),
    check("reading_progress_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

/** Compact per-novel history; repeated reads increment a counter instead of appending events. */
export const readingHistory = pgTable(
  "reading_history",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id").notNull(),
    firstReadAt: timestamp("first_read_at", timestampConfig).defaultNow().notNull(),
    lastReadAt: timestamp("last_read_at", timestampConfig).defaultNow().notNull(),
    readCount: integer("read_count").default(1).notNull(),
  },
  (table) => [
    primaryKey({ name: "reading_history_pk", columns: [table.userId, table.novelId] }),
    foreignKey({
      name: "reading_history_novel_chapter_fk",
      columns: [table.novelId, table.chapterId],
      foreignColumns: [chapters.novelId, chapters.id],
    }).onDelete("cascade"),
    index("reading_history_user_recent_idx").on(table.userId, table.lastReadAt.desc(), table.novelId),
    index("reading_history_chapter_idx").on(table.chapterId),
    check("reading_history_count_positive", sql`${table.readCount} > 0`),
  ],
);

export const ratings = pgTable(
  "ratings",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "ratings_pk", columns: [table.userId, table.novelId] }),
    index("ratings_novel_score_idx").on(table.novelId, table.score),
    check("ratings_score_range", sql`${table.score} between 1 and 5`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").default("PENDING").notNull(),
    isSpoiler: boolean("is_spoiler").default(false).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    moderationNote: text("moderation_note"),
    moderatedBy: uuid("moderated_by").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", timestampConfig),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", timestampConfig),
  },
  (table) => [
    uniqueIndex("reviews_user_novel_uidx").on(table.userId, table.novelId),
    index("reviews_novel_public_created_idx")
      .on(table.novelId, table.createdAt.desc(), table.id)
      .where(sql`${table.status} = 'PUBLISHED' and ${table.deletedAt} is null`),
    index("reviews_moderation_queue_idx").on(table.status, table.createdAt, table.id),
    check("reviews_body_not_blank", sql`length(btrim(${table.body})) > 0`),
    check("reviews_like_count_nonnegative", sql`${table.likeCount} >= 0`),
  ],
);

export const reviewLikes = pgTable(
  "review_likes",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviews.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "review_likes_pk", columns: [table.reviewId, table.userId] }),
    index("review_likes_user_idx").on(table.userId, table.createdAt.desc()),
  ],
);

export type UserLibraryEntry = typeof userLibrary.$inferSelect;
export type ReadingProgress = typeof readingProgress.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Review = typeof reviews.$inferSelect;
