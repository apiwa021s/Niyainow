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
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { chapters, novels } from "./content";
import { coinLedgerTypeEnum, libraryStatusEnum, reviewStatusEnum } from "./enums";

const timestampConfig = { mode: "date", withTimezone: true } as const;

/** Current spendable balance. Every mutation must also append a ledger row. */
export const coinWallets = pgTable(
  "coin_wallets",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "restrict" }),
    balance: integer("balance").default(0).notNull(),
    paidBalance: integer("paid_balance").default(0).notNull(),
    bonusBalance: integer("bonus_balance").default(0).notNull(),
    promoBalance: integer("promo_balance").default(0).notNull(),
    paidValueMinor: integer("paid_value_minor").default(0).notNull(),
    paidValueCurrency: varchar("paid_value_currency", { length: 3 }),
    lifetimeCredited: integer("lifetime_credited").default(0).notNull(),
    lifetimeSpent: integer("lifetime_spent").default(0).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig)
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    check(
      "coin_wallets_amounts_nonnegative",
      sql`${table.balance} >= 0 and ${table.lifetimeCredited} >= 0 and ${table.lifetimeSpent} >= 0`,
    ),
    check("coin_wallets_bucket_sum_valid", sql`${table.balance} = ${table.paidBalance} + ${table.bonusBalance} + ${table.promoBalance}`),
    check("coin_wallets_paid_value_valid", sql`${table.paidValueMinor} >= 0 and (${table.paidBalance} > 0 or ${table.paidValueMinor} = 0) and ((${table.paidValueMinor} = 0 and ${table.paidValueCurrency} is null) or (${table.paidValueMinor} > 0 and ${table.paidValueCurrency} ~ '^[A-Z]{3}$'))`),
  ],
);

/** Append-only accounting history. Idempotency keys prevent duplicate charges. */
export const coinLedgerEntries = pgTable(
  "coin_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: coinLedgerTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    paidAmount: integer("paid_amount").default(0).notNull(),
    bonusAmount: integer("bonus_amount").default(0).notNull(),
    promoAmount: integer("promo_amount").default(0).notNull(),
    eligibleRevenueMinor: integer("eligible_revenue_minor").default(0).notNull(),
    revenueCurrency: varchar("revenue_currency", { length: 3 }),
    balanceAfter: integer("balance_after").notNull(),
    chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "restrict" }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    externalReference: varchar("external_reference", { length: 255 }),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("coin_ledger_entries_idempotency_uidx").on(table.idempotencyKey),
    unique("coin_ledger_entries_user_id_unique").on(table.userId, table.id),
    unique("coin_ledger_entries_chapter_id_unique").on(table.chapterId, table.id),
    uniqueIndex("coin_ledger_entries_external_reference_uidx")
      .on(table.externalReference)
      .where(sql`${table.externalReference} is not null`),
    index("coin_ledger_entries_user_created_idx").on(table.userId, table.createdAt.desc(), table.id.desc()),
    index("coin_ledger_entries_chapter_idx").on(table.chapterId, table.userId),
    check("coin_ledger_entries_amount_nonzero", sql`${table.amount} <> 0`),
    check("coin_ledger_entries_bucket_sum_valid", sql`${table.amount} = ${table.paidAmount} + ${table.bonusAmount} + ${table.promoAmount}`),
    check("coin_ledger_entries_revenue_valid", sql`${table.eligibleRevenueMinor} >= 0 and ((${table.eligibleRevenueMinor} = 0 and ${table.revenueCurrency} is null) or (${table.eligibleRevenueMinor} > 0 and ${table.revenueCurrency} ~ '^[A-Z]{3}$'))`),
    check("coin_ledger_entries_balance_nonnegative", sql`${table.balanceAfter} >= 0`),
    check(
      "coin_ledger_entries_direction_valid",
      sql`(${table.type} = 'CHAPTER_UNLOCK' and ${table.amount} < 0)
        or (${table.type} in ('TOP_UP', 'ADMIN_CREDIT', 'PROMOTION', 'REFUND') and ${table.amount} > 0)
        or (${table.type} = 'ADJUSTMENT' and ${table.amount} <> 0)`,
    ),
  ],
);

export const coinPackages = pgTable(
  "coin_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    coinAmount: integer("coin_amount").notNull(),
    bonusCoinAmount: integer("bonus_coin_amount").default(0).notNull(),
    priceMinor: integer("price_minor").notNull(),
    currency: varchar("currency", { length: 3 }).default("THB").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("coin_packages_active_order_idx").on(table.isActive, table.sortOrder),
    check("coin_packages_amounts_valid", sql`${table.coinAmount} > 0 and ${table.bonusCoinAmount} >= 0 and ${table.priceMinor} > 0`),
    check("coin_packages_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

/** Permanent reader entitlement and the immutable price paid at purchase time. */
export const chapterUnlocks = pgTable(
  "chapter_unlocks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "restrict" }),
    ledgerEntryId: uuid("ledger_entry_id").notNull(),
    pricePaid: integer("price_paid").notNull(),
    unlockedAt: timestamp("unlocked_at", timestampConfig).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: "chapter_unlocks_pk", columns: [table.userId, table.chapterId] }),
    foreignKey({
      name: "chapter_unlocks_user_ledger_fk",
      columns: [table.userId, table.ledgerEntryId],
      foreignColumns: [coinLedgerEntries.userId, coinLedgerEntries.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "chapter_unlocks_chapter_ledger_fk",
      columns: [table.chapterId, table.ledgerEntryId],
      foreignColumns: [coinLedgerEntries.chapterId, coinLedgerEntries.id],
    }).onDelete("restrict"),
    uniqueIndex("chapter_unlocks_ledger_entry_uidx").on(table.ledgerEntryId),
    index("chapter_unlocks_chapter_idx").on(table.chapterId, table.userId),
    index("chapter_unlocks_user_recent_idx").on(table.userId, table.unlockedAt.desc(), table.chapterId),
    check("chapter_unlocks_price_positive", sql`${table.pricePaid} > 0`),
  ],
);

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
export type CoinWallet = typeof coinWallets.$inferSelect;
export type CoinLedgerEntry = typeof coinLedgerEntries.$inferSelect;
export type ChapterUnlock = typeof chapterUnlocks.$inferSelect;
