import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { novels } from "./content";
import { rankingPeriodEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

/** Daily rollup target for buffered/de-duplicated view and engagement events. */
export const novelDailyStats = pgTable(
  "novel_daily_stats",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    statDate: date("stat_date", { mode: "string" }).notNull(),
    views: bigint("views", { mode: "number" }).default(0).notNull(),
    uniqueReaders: bigint("unique_readers", { mode: "number" }).default(0).notNull(),
    chapterReads: bigint("chapter_reads", { mode: "number" }).default(0).notNull(),
    chapterCompletions: bigint("chapter_completions", { mode: "number" }).default(0).notNull(),
    libraryAdds: integer("library_adds").default(0).notNull(),
    follows: integer("follows").default(0).notNull(),
    ratings: integer("ratings").default(0).notNull(),
    reviews: integer("reviews").default(0).notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_daily_stats_pk", columns: [table.novelId, table.statDate] }),
    index("novel_daily_stats_date_views_idx").on(table.statDate, table.views.desc(), table.novelId),
    check(
      "novel_daily_stats_nonnegative",
      sql`${table.views} >= 0 and ${table.uniqueReaders} >= 0 and ${table.chapterReads} >= 0 and ${table.chapterCompletions} >= 0 and ${table.libraryAdds} >= 0 and ${table.follows} >= 0 and ${table.ratings} >= 0 and ${table.reviews} >= 0`,
    ),
    check("novel_daily_stats_unique_lte_views", sql`${table.uniqueReaders} <= ${table.views}`),
    check("novel_daily_stats_completions_lte_reads", sql`${table.chapterCompletions} <= ${table.chapterReads}`),
  ],
);

/** Optional precomputed ranking snapshots; fallback queries aggregate daily rollups, never raw events. */
export const novelRankings = pgTable(
  "novel_rankings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    period: rankingPeriodEnum("period").notNull(),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    rank: integer("rank").notNull(),
    score: numeric("score", { precision: 20, scale: 6, mode: "number" }).notNull(),
    views: bigint("views", { mode: "number" }).default(0).notNull(),
    uniqueReaders: bigint("unique_readers", { mode: "number" }).default(0).notNull(),
    chapterReads: bigint("chapter_reads", { mode: "number" }).default(0).notNull(),
    libraryAdds: integer("library_adds").default(0).notNull(),
    generatedAt: timestamp("generated_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("novel_rankings_period_novel_uidx").on(table.period, table.periodStart, table.novelId),
    uniqueIndex("novel_rankings_period_rank_uidx").on(table.period, table.periodStart, table.rank),
    index("novel_rankings_public_idx").on(table.period, table.periodStart.desc(), table.rank, table.novelId),
    check("novel_rankings_rank_positive", sql`${table.rank} > 0`),
    check("novel_rankings_period_valid", sql`${table.periodEnd} >= ${table.periodStart}`),
    check(
      "novel_rankings_metrics_nonnegative",
      sql`${table.views} >= 0 and ${table.uniqueReaders} >= 0 and ${table.chapterReads} >= 0 and ${table.libraryAdds} >= 0`,
    ),
  ],
);

export type NovelDailyStat = typeof novelDailyStats.$inferSelect;
export type NovelRanking = typeof novelRankings.$inferSelect;
