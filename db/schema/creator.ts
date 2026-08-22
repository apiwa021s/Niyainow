import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./auth";
import { chapters, novels, tags } from "./content";
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

export const writerProfileTags = pgTable("writer_profile_tags", {
  writerId: uuid("writer_id").notNull().references(() => writerProfiles.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "restrict" }),
  sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
  primaryKey({ name: "writer_profile_tags_pk", columns: [table.writerId, table.tagId] }),
  index("writer_profile_tags_tag_writer_idx").on(table.tagId, table.writerId),
  check("writer_profile_tags_sort_nonnegative", sql`${table.sortOrder} >= 0`),
]);

export const membershipBenefits = pgTable("membership_benefits", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 80 }).notNull(),
  nameTh: varchar("name_th", { length: 160 }).notNull(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("membership_benefits_slug_uidx").on(table.slug),
  index("membership_benefits_active_order_idx").on(table.isActive, table.sortOrder),
  check("membership_benefits_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'`),
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

export const writerMembershipPlanBenefits = pgTable("writer_membership_plan_benefits", {
  membershipPlanId: uuid("membership_plan_id").notNull().references(() => writerMembershipPlans.id, { onDelete: "cascade" }),
  benefitId: uuid("benefit_id").notNull().references(() => membershipBenefits.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ name: "writer_membership_plan_benefits_pk", columns: [table.membershipPlanId, table.benefitId] }),
  index("writer_membership_plan_benefits_benefit_idx").on(table.benefitId, table.membershipPlanId),
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
  externalReference: varchar("external_reference", { length: 255 }),
  reversalOfRevenueEventId: uuid("reversal_of_revenue_event_id"),
  status: revenueStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("creator_revenue_events_reader_transaction_uidx").on(table.readerTransactionId).where(sql`${table.readerTransactionId} is not null`),
  uniqueIndex("creator_revenue_events_external_reference_uidx").on(table.externalReference).where(sql`${table.externalReference} is not null`),
  index("creator_revenue_events_reversal_idx").on(table.reversalOfRevenueEventId).where(sql`${table.reversalOfRevenueEventId} is not null`),
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
  dedupeKey: varchar("dedupe_key", { length: 255 }),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("notifications_user_created_idx").on(table.userId, table.createdAt.desc(), table.id),
  uniqueIndex("notifications_user_dedupe_uidx").on(table.userId, table.dedupeKey).where(sql`${table.dedupeKey} is not null`),
]);

export const domainOutboxEvents = pgTable("domain_outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 80 }).notNull(),
  aggregateType: varchar("aggregate_type", { length: 80 }).notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  dedupeKey: varchar("dedupe_key", { length: 255 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  status: varchar("status", { length: 32 }).default("PENDING").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  availableAt: timestamp("available_at", timestampConfig).defaultNow().notNull(),
  processedAt: timestamp("processed_at", timestampConfig),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("domain_outbox_events_dedupe_uidx").on(table.dedupeKey),
  index("domain_outbox_events_pending_idx").on(table.status, table.availableAt, table.createdAt),
  check("domain_outbox_events_status_valid", sql`${table.status} in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')`),
  check("domain_outbox_events_attempts_nonnegative", sql`${table.attempts} >= 0`),
]);

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