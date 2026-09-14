import { sql } from "drizzle-orm";
import {
  check,
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

const timestampConfig = { mode: "date", withTimezone: true } as const;
const validClassSql = "('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')";

/** One authoritative Reader Class identity per signed-in account. */
export const readerClassProfiles = pgTable(
  "reader_class_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    profileVersion: smallint("profile_version").default(1).notNull(),
    mainClassId: varchar("main_class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
    subClassId: varchar("sub_class_id", { length: 32 }).$type<ReaderClassId>().notNull(),
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
    check("reader_class_profiles_version_valid", sql`${table.profileVersion} = 1`),
    check("reader_class_profiles_main_class_valid", sql.raw(`${table.mainClassId.name} in ${validClassSql}`)),
    check("reader_class_profiles_sub_class_valid", sql.raw(`${table.subClassId.name} in ${validClassSql}`)),
    check("reader_class_profiles_classes_distinct", sql`${table.mainClassId} <> ${table.subClassId}`),
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
    totalExp: integer("total_exp").default(0).notNull(),
    unlockedAt: timestamp("unlocked_at", timestampConfig).defaultNow().notNull(),
    lastExpAt: timestamp("last_exp_at", timestampConfig),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ name: "reader_class_progress_pk", columns: [table.userId, table.classId] }),
    index("reader_class_progress_user_exp_idx").on(table.userId, table.totalExp.desc(), table.classId),
    check("reader_class_progress_class_valid", sql.raw(`${table.classId.name} in ${validClassSql}`)),
    check("reader_class_progress_exp_nonnegative", sql`${table.totalExp} >= 0`),
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
    classId: varchar("class_id", { length: 32 }).$type<ReaderClassId>(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    expDelta: integer("exp_delta").default(0).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    occurredAt: timestamp("occurred_at", timestampConfig).defaultNow().notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reader_activity_events_user_idempotency_uidx").on(table.userId, table.idempotencyKey),
    index("reader_activity_events_user_occurred_idx").on(table.userId, table.occurredAt.desc(), table.id.desc()),
    index("reader_activity_events_class_occurred_idx").on(table.classId, table.occurredAt.desc(), table.id.desc()),
    check(
      "reader_activity_events_class_valid",
      sql.raw(`${table.classId.name} is null or ${table.classId.name} in ${validClassSql}`),
    ),
    check("reader_activity_events_type_valid", sql`${table.eventType} ~ '^[a-z][a-z0-9_.-]{2,63}$'`),
    check("reader_activity_events_exp_delta_bounded", sql`${table.expDelta} between -100000 and 100000`),
    check("reader_activity_events_metadata_object", sql`jsonb_typeof(${table.metadata}) = 'object'`),
  ],
);

export type ReaderClassProfileRow = typeof readerClassProfiles.$inferSelect;
export type ReaderClassProgressRow = typeof readerClassProgress.$inferSelect;
export type ReaderActivityEventRow = typeof readerActivityEvents.$inferSelect;
