import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { chapters, novels } from "./content";
import {
  creatorLedgerTypeEnum,
  membershipPlanStatusEnum,
  membershipStatusEnum,
  moderationStateEnum,
  notificationTypeEnum,
  postStatusEnum,
  postVisibilityEnum,
  revenueContractTypeEnum,
  revenueSourceEnum,
  revenueStatusEnum,
} from "./enums";
import { writerProfiles } from "./identity";
import { coinLedgerEntries } from "./user";

const timestampConfig = { mode: "date", withTimezone: true } as const;

export const writerFollows = pgTable("writer_follows", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "cascade" }),
  storyNotificationsEnabled: boolean("story_notifications_enabled").default(true).notNull(),
  postNotificationsEnabled: boolean("post_notifications_enabled").default(true).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  primaryKey({ name: "writer_follows_pk", columns: [table.userId, table.writerId] }),
  index("writer_follows_writer_created_idx").on(table.writerId, table.createdAt.desc(), table.userId),
]);

export const writerMembershipPlans = pgTable("writer_membership_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  priceMinor: integer("price_minor").notNull(),
  currency: varchar("currency", { length: 3 }).default("THB").notNull(),
  earlyAccessChapterCount: integer("early_access_chapter_count").default(0).notNull(),
  status: membershipPlanStatusEnum("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("writer_membership_plans_one_active_uidx").on(table.writerId).where(sql`${table.status} = 'ACTIVE'`),
  check("writer_membership_plans_price_positive", sql`${table.priceMinor} > 0`),
  check("writer_membership_plans_early_count_nonnegative", sql`${table.earlyAccessChapterCount} >= 0`),
]);

export const readerMemberships = pgTable("reader_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  readerId: uuid("reader_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  membershipPlanId: uuid("membership_plan_id").notNull().references(() => writerMembershipPlans.id, { onDelete: "restrict" }),
  status: membershipStatusEnum("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", timestampConfig).notNull(),
  currentPeriodEnd: timestamp("current_period_end", timestampConfig).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  provider: varchar("provider", { length: 80 }),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("reader_memberships_provider_subscription_uidx").on(table.provider, table.providerSubscriptionId),
  index("reader_memberships_entitlement_idx").on(table.readerId, table.writerId, table.status, table.currentPeriodEnd),
  check("reader_memberships_period_valid", sql`${table.currentPeriodStart} < ${table.currentPeriodEnd}`),
]);

export const writerPosts = pgTable("writer_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  content: text("content").notNull(),
  imageKey: text("image_key"),
  visibility: postVisibilityEnum("visibility").default("public").notNull(),
  status: postStatusEnum("status").default("draft").notNull(),
  moderationState: moderationStateEnum("moderation_state").default("active").notNull(),
  publishedAt: timestamp("published_at", timestampConfig),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("writer_posts_public_idx").on(table.writerId, table.status, table.publishedAt.desc()),
  check("writer_posts_content_not_blank", sql`length(btrim(${table.content})) > 0`),
  check("writer_posts_publish_date_valid", sql`${table.status} <> 'published' or ${table.publishedAt} is not null`),
]);

export const creatorRevenueContracts = pgTable("creator_revenue_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  type: revenueContractTypeEnum("type").notNull(),
  creatorShareBasisPoints: integer("creator_share_basis_points").notNull(),
  platformShareBasisPoints: integer("platform_share_basis_points").notNull(),
  effectiveFrom: timestamp("effective_from", timestampConfig).notNull(),
  effectiveTo: timestamp("effective_to", timestampConfig),
  status: varchar("status", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("creator_revenue_contracts_effective_idx").on(table.writerId, table.effectiveFrom.desc()),
  check("creator_revenue_contracts_shares_valid", sql`${table.creatorShareBasisPoints} >= 0 and ${table.platformShareBasisPoints} >= 0 and ${table.creatorShareBasisPoints} + ${table.platformShareBasisPoints} = 10000`),
  check("creator_revenue_contracts_window_valid", sql`${table.effectiveTo} is null or ${table.effectiveFrom} < ${table.effectiveTo}`),
]);

export const creatorRevenueEvents = pgTable("creator_revenue_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  novelId: uuid("novel_id").references(() => novels.id, { onDelete: "restrict" }),
  chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "restrict" }),
  readerTransactionId: uuid("reader_transaction_id").references(() => coinLedgerEntries.id, { onDelete: "restrict" }),
  sourceType: revenueSourceEnum("source_type").notNull(),
  coinAmount: integer("coin_amount").default(0).notNull(),
  eligibleRevenueMinor: integer("eligible_revenue_minor").notNull(),
  creatorShareBasisPoints: integer("creator_share_basis_points").notNull(),
  platformShareBasisPoints: integer("platform_share_basis_points").notNull(),
  creatorRevenueMinor: integer("creator_revenue_minor").notNull(),
  platformRevenueMinor: integer("platform_revenue_minor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  revenueRuleVersion: varchar("revenue_rule_version", { length: 80 }).notNull(),
  revenueContractId: uuid("revenue_contract_id").references(() => creatorRevenueContracts.id, { onDelete: "restrict" }),
  status: revenueStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("creator_revenue_events_reader_transaction_uidx").on(table.readerTransactionId).where(sql`${table.readerTransactionId} is not null`),
  index("creator_revenue_events_writer_created_idx").on(table.writerId, table.createdAt.desc(), table.id),
  check("creator_revenue_events_split_valid", sql`${table.eligibleRevenueMinor} = ${table.creatorRevenueMinor} + ${table.platformRevenueMinor}`),
]);

export const creatorLedgerEntries = pgTable("creator_ledger_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "restrict" }),
  novelId: uuid("novel_id").references(() => novels.id, { onDelete: "restrict" }),
  chapterId: uuid("chapter_id").references(() => chapters.id, { onDelete: "restrict" }),
  revenueEventId: uuid("revenue_event_id").references(() => creatorRevenueEvents.id, { onDelete: "restrict" }),
  type: creatorLedgerTypeEnum("type").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: revenueStatusEnum("status").notNull(),
  referenceId: varchar("reference_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("creator_ledger_entries_reference_uidx").on(table.referenceId),
  index("creator_ledger_entries_writer_created_idx").on(table.writerId, table.createdAt.desc(), table.id),
  check("creator_ledger_entries_amount_nonzero", sql`${table.amountMinor} <> 0`),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  entityType: varchar("entity_type", { length: 80 }),
  entityId: uuid("entity_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt.desc(), table.id)]);

export const contentReports = pgTable("content_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterUserId: uuid("reporter_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  reason: varchar("reason", { length: 120 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 32 }).default("OPEN").notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("content_reports_status_created_idx").on(table.status, table.createdAt, table.id),
  check("content_reports_entity_type_valid", sql`${table.entityType} in ('story', 'chapter', 'post')`),
]);