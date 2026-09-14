import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { QuizQuestionId, ReaderClassId } from "@/lib/onboarding/reader-class";

import { users } from "./auth";
import { chapters, novels } from "./content";

const timestampConfig = { mode: "date", withTimezone: true } as const;
const validClassSql = "('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')";

/** One authoritative Reader Class identity per signed-in account. */
export const readerClassProfiles = pgTable(
  "reader_class_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    profileVersion: smallint("profile_version").default(2).notNull(),
    mainClassId: varchar("main_class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    /** Compatibility/index column for the first of the two sub classes. */
    subClassId: varchar("sub_class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    subClassIds: jsonb("sub_class_ids").$type<ReaderClassId[]>().notNull(),
    selectedClassIds: jsonb("selected_class_ids").$type<ReaderClassId[]>().notNull(),
    quizAnswers: jsonb("quiz_answers").$type<Record<QuizQuestionId, string>>().notNull(),
    completedAt: timestamp("completed_at", timestampConfig).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reader_class_profiles_main_class_idx").on(table.mainClassId, table.updatedAt.desc()),
    index("reader_class_profiles_sub_class_idx").on(table.subClassId, table.updatedAt.desc()),
    check("reader_class_profiles_version_valid", sql`${table.profileVersion} between 1 and 2`),
    check("reader_class_profiles_main_class_valid", sql.raw(`${table.mainClassId.name} in ${validClassSql}`)),
    check("reader_class_profiles_sub_class_valid", sql.raw(`${table.subClassId.name} in ${validClassSql}`)),
    check("reader_class_profiles_classes_distinct", sql`${table.mainClassId} <> ${table.subClassId}`),
    check(
      "reader_class_profiles_sub_classes_valid",
      sql`jsonb_typeof(${table.subClassIds}) = 'array' and jsonb_array_length(${table.subClassIds}) = 2`,
    ),
    check(
      "reader_class_profiles_selected_classes_valid",
      sql`jsonb_typeof(${table.selectedClassIds}) = 'array' and jsonb_array_length(${table.selectedClassIds}) = 3`,
    ),
    check("reader_class_profiles_answers_object", sql`jsonb_typeof(${table.quizAnswers}) = 'object'`),
  ],
);

/** Fast aggregate for future level/EXP reads; the activity ledger remains the audit trail. */
export const readerClassProgress = pgTable(
  "reader_class_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: varchar("class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    /** Fixed-point EXP (1 EXP = 1,000 milli) so affinity bonuses never lose precision. */
    totalExpMilli: integer("total_exp_milli").default(0).notNull(),
    prestige: smallint("prestige").default(0).notNull(),
    unlockedAt: timestamp("unlocked_at", timestampConfig).defaultNow().notNull(),
    lastExpAt: timestamp("last_exp_at", timestampConfig),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "reader_class_progress_pk", columns: [table.userId, table.classId] }),
    index("reader_class_progress_user_exp_idx").on(table.userId, table.totalExpMilli.desc(), table.classId),
    check("reader_class_progress_class_valid", sql.raw(`${table.classId.name} in ${validClassSql}`)),
    check("reader_class_progress_exp_nonnegative", sql`${table.totalExpMilli} >= 0`),
    check("reader_class_progress_prestige_nonnegative", sql`${table.prestige} >= 0`),
  ],
);

/** Append-only activity/EXP history with per-user idempotency protection. */
export const readerActivityEvents = pgTable(
  "reader_activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    readerExpDelta: integer("reader_exp_delta").default(0).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    occurredAt: timestamp("occurred_at", timestampConfig).defaultNow().notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reader_activity_events_user_idempotency_uidx").on(table.userId, table.idempotencyKey),
    index("reader_activity_events_user_occurred_idx").on(table.userId, table.occurredAt.desc(), table.id.desc()),
    check("reader_activity_events_type_valid", sql`${table.eventType} ~ '^[a-z][a-z0-9_.-]{2,63}$'`),
    check("reader_activity_events_exp_delta_bounded", sql`${table.readerExpDelta} between -100000 and 100000`),
    check("reader_activity_events_metadata_object", sql`jsonb_typeof(${table.metadata}) = 'object'`),
  ],
);

/** Account-wide progression and streak state. */
export const readerAccounts = pgTable(
  "reader_accounts",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    totalExp: integer("total_exp").default(0).notNull(),
    currentStreakDays: integer("current_streak_days").default(0).notNull(),
    longestStreakDays: integer("longest_streak_days").default(0).notNull(),
    lastQualifiedReadDate: date("last_qualified_read_date", { mode: "string" }),
    streakFreezesAvailable: smallint("streak_freezes_available").default(1).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reader_accounts_exp_idx").on(table.totalExp.desc(), table.userId),
    check("reader_accounts_exp_nonnegative", sql`${table.totalExp} >= 0`),
    check("reader_accounts_streak_nonnegative", sql`${table.currentStreakDays} >= 0 and ${table.longestStreakDays} >= 0`),
    check("reader_accounts_freezes_nonnegative", sql`${table.streakFreezesAvailable} >= 0`),
  ],
);

/** Curated per-novel affinity. Weights are thousandths and should total 1,000. */
export const novelClassAffinities = pgTable(
  "novel_class_affinities",
  {
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    classId: varchar("class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    weightMilli: smallint("weight_milli").notNull(),
    source: varchar("source", { length: 24 }).default("manual").notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "novel_class_affinities_pk", columns: [table.novelId, table.classId] }),
    index("novel_class_affinities_class_idx").on(table.classId, table.weightMilli.desc(), table.novelId),
    check("novel_class_affinities_class_valid", sql.raw(`${table.classId.name} in ${validClassSql}`)),
    check("novel_class_affinities_weight_valid", sql`${table.weightMilli} between 1 and 1000`),
    check("novel_class_affinities_source_valid", sql`${table.source} in ('manual', 'import', 'inferred')`),
  ],
);

/** Server-reconciled evidence from one browser reading session. */
export const readerReadingSessions = pgTable(
  "reader_reading_sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    maxProgressBasisPoints: integer("max_progress_basis_points").default(0).notNull(),
    activeSeconds: integer("active_seconds").default(0).notNull(),
    sampleCount: integer("sample_count").default(0).notNull(),
    suspiciousReason: varchar("suspicious_reason", { length: 80 }),
    qualifiedAt: timestamp("qualified_at", timestampConfig),
    startedAt: timestamp("started_at", timestampConfig).defaultNow().notNull(),
    lastSampleAt: timestamp("last_sample_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    index("reader_reading_sessions_user_chapter_idx").on(table.userId, table.chapterId, table.startedAt.desc()),
    index("reader_reading_sessions_unqualified_idx")
      .on(table.userId, table.lastSampleAt)
      .where(sql`${table.qualifiedAt} is null`),
    check("reader_reading_sessions_progress_valid", sql`${table.maxProgressBasisPoints} between 0 and 10000`),
    check("reader_reading_sessions_active_nonnegative", sql`${table.activeSeconds} >= 0`),
    check("reader_reading_sessions_samples_nonnegative", sql`${table.sampleCount} >= 0`),
  ],
);

/** Aggregate reread state used to enforce 100% / 20% / 0% rewards. */
export const readerChapterQualifications = pgTable(
  "reader_chapter_qualifications",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    novelId: uuid("novel_id")
      .notNull()
      .references(() => novels.id, { onDelete: "cascade" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    qualifiedReadCount: smallint("qualified_read_count").default(0).notNull(),
    readerExpAwarded: integer("reader_exp_awarded").default(0).notNull(),
    classExpAwardedMilli: integer("class_exp_awarded_milli").default(0).notNull(),
    firstQualifiedAt: timestamp("first_qualified_at", timestampConfig).notNull(),
    lastQualifiedAt: timestamp("last_qualified_at", timestampConfig).notNull(),
  },
  (table) => [
    primaryKey({ name: "reader_chapter_qualifications_pk", columns: [table.userId, table.chapterId] }),
    index("reader_chapter_qualifications_user_novel_idx").on(table.userId, table.novelId, table.lastQualifiedAt.desc()),
    check("reader_chapter_qualifications_count_nonnegative", sql`${table.qualifiedReadCount} >= 0`),
    check("reader_chapter_qualifications_exp_nonnegative", sql`${table.readerExpAwarded} >= 0 and ${table.classExpAwardedMilli} >= 0`),
  ],
);

/** Per-calendar-day counters for caps and future daily missions. */
export const readerDailyProgress = pgTable(
  "reader_daily_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    readingExpAwarded: integer("reading_exp_awarded").default(0).notNull(),
    qualifiedChapterCount: integer("qualified_chapter_count").default(0).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "reader_daily_progress_pk", columns: [table.userId, table.activityDate] }),
    index("reader_daily_progress_date_exp_idx").on(table.activityDate, table.readingExpAwarded.desc(), table.userId),
    check("reader_daily_progress_exp_cap", sql`${table.readingExpAwarded} between 0 and 500`),
    check("reader_daily_progress_count_nonnegative", sql`${table.qualifiedChapterCount} >= 0`),
  ],
);

/** Per-class allocation rows keep the event ledger normalized and auditable. */
export const readerClassExpEntries = pgTable(
  "reader_class_exp_entries",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => readerActivityEvents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    classId: varchar("class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    expMilli: integer("exp_milli").notNull(),
    affinityWeightMilli: smallint("affinity_weight_milli").notNull(),
    mainClassBonusBps: smallint("main_class_bonus_bps").default(0).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "reader_class_exp_entries_pk", columns: [table.eventId, table.classId] }),
    index("reader_class_exp_entries_user_class_idx").on(table.userId, table.classId, table.createdAt.desc()),
    check("reader_class_exp_entries_class_valid", sql.raw(`${table.classId.name} in ${validClassSql}`)),
    check("reader_class_exp_entries_exp_nonnegative", sql`${table.expMilli} >= 0`),
    check("reader_class_exp_entries_affinity_valid", sql`${table.affinityWeightMilli} between 1 and 1000`),
    check("reader_class_exp_entries_bonus_valid", sql`${table.mainClassBonusBps} in (0, 1000)`),
  ],
);

export type ReaderClassProfileRow = typeof readerClassProfiles.$inferSelect;
export type ReaderClassProgressRow = typeof readerClassProgress.$inferSelect;
export type ReaderActivityEventRow = typeof readerActivityEvents.$inferSelect;
export type ReaderAccountRow = typeof readerAccounts.$inferSelect;
export type ReaderReadingSessionRow = typeof readerReadingSessions.$inferSelect;
