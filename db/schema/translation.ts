import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { chapters, novels } from "./content";
import { novelImportChapters, novelImportSources } from "./import";

const timestampConfig = { mode: "date", withTimezone: true } as const;

/** Root aggregate for translation work. An imported work may exist before a public novel does. */
export const translationWorkspaces = pgTable("translation_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  importSourceId: uuid("import_source_id").notNull().references(() => novelImportSources.id, { onDelete: "restrict" }),
  novelId: uuid("novel_id").references(() => novels.id, { onDelete: "set null" }),
  sourceLanguage: varchar("source_language", { length: 35 }).notNull(),
  targetLanguage: varchar("target_language", { length: 35 }).notNull(),
  status: varchar("status", { length: 24 }).default("SETUP").notNull(),
  assignedEditorId: uuid("assigned_editor_id").references(() => users.id, { onDelete: "set null" }),
  version: integer("version").default(1).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_workspaces_source_target_uidx").on(table.importSourceId, table.targetLanguage),
  index("translation_workspaces_status_updated_idx").on(table.status, table.updatedAt.desc(), table.id),
  index("translation_workspaces_novel_idx").on(table.novelId),
  check("translation_workspaces_languages_differ", sql`lower(${table.sourceLanguage}) <> lower(${table.targetLanguage})`),
  check("translation_workspaces_language_format", sql`${table.sourceLanguage} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and ${table.targetLanguage} ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'`),
  check("translation_workspaces_status_valid", sql`${table.status} in ('SETUP','READY','TRANSLATING','REVIEW','COMPLETED','PAUSED')`),
  check("translation_workspaces_version_positive", sql`${table.version} > 0`),
]);

/** Editable current configuration; every accepted change is also copied to the immutable version table. */
export const translationProfiles = pgTable("translation_profiles", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).default("Default").notNull(),
  styleGuide: text("style_guide").default("").notNull(),
  instructions: text("instructions").default("").notNull(),
  preserveParagraphs: boolean("preserve_paragraphs").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [check("translation_profiles_version_positive", sql`${table.version} > 0`)]);

export const translationProfileVersions = pgTable("translation_profile_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("translation_profile_versions_workspace_version_uidx").on(table.workspaceId, table.version),
]);

export const translationGlossaryEntries = pgTable("translation_glossary_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  sourceTerm: text("source_term").notNull(),
  targetTerm: text("target_term").notNull(),
  note: text("note"),
  isLocked: boolean("is_locked").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_glossary_workspace_source_uidx").on(table.workspaceId, sql`lower(${table.sourceTerm})`),
  index("translation_glossary_workspace_locked_idx").on(table.workspaceId, table.isLocked),
  check("translation_glossary_terms_not_blank", sql`length(btrim(${table.sourceTerm})) > 0 and length(btrim(${table.targetTerm})) > 0`),
]);

export const translationCharacters = pgTable("translation_characters", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  sourceName: text("source_name").notNull(),
  targetName: text("target_name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().default([]).notNull(),
  description: text("description"),
  speakingStyle: text("speaking_style"),
  isLocked: boolean("is_locked").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_characters_workspace_source_uidx").on(table.workspaceId, sql`lower(${table.sourceName})`),
  index("translation_characters_workspace_locked_idx").on(table.workspaceId, table.isLocked),
]);

export const translationAiModels = pgTable("translation_ai_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  provider: varchar("provider", { length: 80 }).notNull(),
  modelName: varchar("model_name", { length: 200 }).notNull(),
  baseUrl: text("base_url").notNull(),
  apiKeyEnv: varchar("api_key_env", { length: 120 }).notNull(),
  inputCostMicrosPerMillion: bigint("input_cost_micros_per_million", { mode: "number" }).default(0).notNull(),
  outputCostMicrosPerMillion: bigint("output_cost_micros_per_million", { mode: "number" }).default(0).notNull(),
  selectionPriority: integer("selection_priority").default(100).notNull(),
  supportedLanguagePairs: jsonb("supported_language_pairs").$type<string[]>().default(["*"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_ai_models_provider_model_uidx").on(table.provider, table.modelName),
  check("translation_ai_models_base_url_https", sql`${table.baseUrl} ~ '^https://'`),
  check("translation_ai_models_env_format", sql`${table.apiKeyEnv} ~ '^AI_[A-Z0-9_]{1,116}$'`),
  check("translation_ai_models_cost_nonnegative", sql`${table.inputCostMicrosPerMillion} >= 0 and ${table.outputCostMicrosPerMillion} >= 0`),
  check("translation_ai_models_priority_valid", sql`${table.selectionPriority} between 0 and 1000`),
]);

export const translationPromptVersions = pgTable("translation_prompt_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  version: integer("version").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("translation_prompt_versions_name_version_uidx").on(table.name, table.version),
  check("translation_prompt_versions_not_blank", sql`length(btrim(${table.systemPrompt})) > 0`),
]);

/** Exact immutable copy of imported source used by a translation revision. */
export const translationSourceSnapshots = pgTable("translation_source_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  importChapterId: uuid("import_chapter_id").notNull().references(() => novelImportChapters.id, { onDelete: "restrict" }),
  sourceLanguage: varchar("source_language", { length: 35 }).notNull(),
  sourceVersion: integer("source_version").notNull(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("translation_source_snapshots_identity_uidx").on(table.workspaceId, table.importChapterId, table.sourceHash),
  index("translation_source_snapshots_workspace_chapter_idx").on(table.workspaceId, table.importChapterId, table.createdAt.desc()),
  check("translation_source_snapshots_hash_format", sql`${table.sourceHash} ~ '^[0-9a-f]{64}$'`),
  check("translation_source_snapshots_content_not_blank", sql`length(btrim(${table.content})) > 0`),
]);

export const translationSourceSegments = pgTable("translation_source_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceSnapshotId: uuid("source_snapshot_id").notNull().references(() => translationSourceSnapshots.id, { onDelete: "cascade" }),
  segmentIndex: integer("segment_index").notNull(),
  content: text("content").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
}, (table) => [
  uniqueIndex("translation_source_segments_snapshot_index_uidx").on(table.sourceSnapshotId, table.segmentIndex),
  check("translation_source_segments_index_nonnegative", sql`${table.segmentIndex} >= 0`),
  check("translation_source_segments_not_blank", sql`length(btrim(${table.content})) > 0`),
]);

export const translationChapters = pgTable("translation_chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  importChapterId: uuid("import_chapter_id").notNull().references(() => novelImportChapters.id, { onDelete: "restrict" }),
  sourceSnapshotId: uuid("source_snapshot_id").notNull().references(() => translationSourceSnapshots.id, { onDelete: "restrict" }),
  linkedChapterId: uuid("linked_chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  chapterNumber: integer("chapter_number").notNull(),
  status: varchar("status", { length: 24 }).default("READY").notNull(),
  lockVersion: integer("lock_version").default(1).notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_chapters_workspace_import_uidx").on(table.workspaceId, table.importChapterId),
  uniqueIndex("translation_chapters_workspace_number_uidx").on(table.workspaceId, table.chapterNumber),
  index("translation_chapters_workspace_status_idx").on(table.workspaceId, table.status, table.chapterNumber),
  check("translation_chapters_number_positive", sql`${table.chapterNumber} > 0`),
  check("translation_chapters_status_valid", sql`${table.status} in ('READY','STALE','QUEUED','TRANSLATING','DRAFT','QA_FAILED','REVIEW','APPROVED','PUBLISHED','FAILED')`),
]);

export const translationContextSnapshots = pgTable("translation_context_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  translationChapterId: uuid("translation_chapter_id").notNull().references(() => translationChapters.id, { onDelete: "cascade" }),
  profileVersion: integer("profile_version").notNull(),
  contextHash: varchar("context_hash", { length: 64 }).notNull(),
  context: jsonb("context").$type<Record<string, unknown>>().notNull(),
  estimatedTokens: integer("estimated_tokens").default(0).notNull(),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("translation_context_chapter_created_idx").on(table.translationChapterId, table.createdAt.desc()),
  check("translation_context_hash_format", sql`${table.contextHash} ~ '^[0-9a-f]{64}$'`),
  check("translation_context_tokens_nonnegative", sql`${table.estimatedTokens} >= 0`),
]);

/** A save always inserts a new row. Approved and published text is never overwritten. */
export const translationVersions = pgTable("translation_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  translationChapterId: uuid("translation_chapter_id").notNull().references(() => translationChapters.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull(),
  parentVersionId: uuid("parent_version_id"),
  contextSnapshotId: uuid("context_snapshot_id").references(() => translationContextSnapshots.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 24 }).default("DRAFT").notNull(),
  origin: varchar("origin", { length: 16 }).default("MANUAL").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", timestampConfig),
  publishedAt: timestamp("published_at", timestampConfig),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("translation_versions_chapter_revision_uidx").on(table.translationChapterId, table.revision),
  uniqueIndex("translation_versions_one_approved_uidx").on(table.translationChapterId).where(sql`${table.status} = 'APPROVED'`),
  index("translation_versions_chapter_status_idx").on(table.translationChapterId, table.status, table.revision.desc()),
  foreignKey({ name: "translation_versions_parent_fk", columns: [table.parentVersionId], foreignColumns: [table.id] }).onDelete("set null"),
  check("translation_versions_revision_positive", sql`${table.revision} > 0`),
  check("translation_versions_status_valid", sql`${table.status} in ('DRAFT','APPROVED','SUPERSEDED','PUBLISHED','REJECTED')`),
  check("translation_versions_origin_valid", sql`${table.origin} in ('MANUAL','AI')`),
  check("translation_versions_content_not_blank", sql`length(btrim(${table.title})) > 0 and length(btrim(${table.content})) > 0`),
  check("translation_versions_approval_valid", sql`(${table.status} not in ('APPROVED','PUBLISHED')) or (${table.approvedBy} is not null and ${table.approvedAt} is not null)`),
]);

export const translationSegments = pgTable("translation_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  translationVersionId: uuid("translation_version_id").notNull().references(() => translationVersions.id, { onDelete: "cascade" }),
  segmentIndex: integer("segment_index").notNull(),
  sourceSegmentId: uuid("source_segment_id").references(() => translationSourceSegments.id, { onDelete: "set null" }),
  content: text("content").notNull(),
}, (table) => [
  uniqueIndex("translation_segments_version_index_uidx").on(table.translationVersionId, table.segmentIndex),
  check("translation_segments_index_nonnegative", sql`${table.segmentIndex} >= 0`),
  check("translation_segments_not_blank", sql`length(btrim(${table.content})) > 0`),
]);

export const translationJobs = pgTable("translation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => translationWorkspaces.id, { onDelete: "cascade" }),
  modelId: uuid("model_id").notNull().references(() => translationAiModels.id, { onDelete: "restrict" }),
  promptVersionId: uuid("prompt_version_id").notNull().references(() => translationPromptVersions.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).default("QUEUED").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
  requestedBy: uuid("requested_by").references(() => users.id, { onDelete: "set null" }),
  totalItems: integer("total_items").default(0).notNull(),
  completedItems: integer("completed_items").default(0).notNull(),
  failedItems: integer("failed_items").default(0).notNull(),
  cancelRequestedAt: timestamp("cancel_requested_at", timestampConfig),
  startedAt: timestamp("started_at", timestampConfig),
  finishedAt: timestamp("finished_at", timestampConfig),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", timestampConfig).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  uniqueIndex("translation_jobs_idempotency_uidx").on(table.idempotencyKey),
  index("translation_jobs_claim_idx").on(table.status, table.createdAt),
  index("translation_jobs_workspace_created_idx").on(table.workspaceId, table.createdAt.desc()),
  check("translation_jobs_status_valid", sql`${table.status} in ('QUEUED','RUNNING','COMPLETED','PARTIAL','FAILED','CANCELLED')`),
  check("translation_jobs_counts_valid", sql`${table.totalItems} >= 0 and ${table.completedItems} >= 0 and ${table.failedItems} >= 0`),
]);

export const translationJobItems = pgTable("translation_job_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").notNull().references(() => translationJobs.id, { onDelete: "cascade" }),
  translationChapterId: uuid("translation_chapter_id").notNull().references(() => translationChapters.id, { onDelete: "cascade" }),
  sourceSnapshotId: uuid("source_snapshot_id").notNull().references(() => translationSourceSnapshots.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 24 }).default("QUEUED").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  availableAt: timestamp("available_at", timestampConfig).defaultNow().notNull(),
  lastError: text("last_error"),
  startedAt: timestamp("started_at", timestampConfig),
  finishedAt: timestamp("finished_at", timestampConfig),
}, (table) => [
  uniqueIndex("translation_job_items_job_chapter_uidx").on(table.jobId, table.translationChapterId),
  index("translation_job_items_claim_idx").on(table.status, table.availableAt, table.id),
  check("translation_job_items_status_valid", sql`${table.status} in ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')`),
  check("translation_job_items_attempts_nonnegative", sql`${table.attempts} >= 0`),
]);

export const translationAiInvocations = pgTable("translation_ai_invocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobItemId: uuid("job_item_id").notNull().references(() => translationJobItems.id, { onDelete: "cascade" }),
  modelId: uuid("model_id").notNull().references(() => translationAiModels.id, { onDelete: "restrict" }),
  contextSnapshotId: uuid("context_snapshot_id").references(() => translationContextSnapshots.id, { onDelete: "set null" }),
  providerRequestId: text("provider_request_id"),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  costMicros: bigint("cost_micros", { mode: "number" }).default(0).notNull(),
  latencyMs: integer("latency_ms").default(0).notNull(),
  status: varchar("status", { length: 16 }).notNull(),
  errorCode: varchar("error_code", { length: 120 }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("translation_ai_invocations_item_idx").on(table.jobItemId, table.createdAt),
  check("translation_ai_invocations_metrics_nonnegative", sql`${table.inputTokens} >= 0 and ${table.outputTokens} >= 0 and ${table.costMicros} >= 0 and ${table.latencyMs} >= 0`),
  check("translation_ai_invocations_status_valid", sql`${table.status} in ('SUCCESS','FAILED')`),
]);

export const translationQaIssues = pgTable("translation_qa_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  translationVersionId: uuid("translation_version_id").notNull().references(() => translationVersions.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 80 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  resolvedAt: timestamp("resolved_at", timestampConfig),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),
}, (table) => [
  index("translation_qa_issues_version_severity_idx").on(table.translationVersionId, table.severity, table.resolvedAt),
  check("translation_qa_issues_severity_valid", sql`${table.severity} in ('INFO','WARNING','CRITICAL')`),
]);

export type TranslationWorkspace = typeof translationWorkspaces.$inferSelect;
export type TranslationChapter = typeof translationChapters.$inferSelect;
export type TranslationVersion = typeof translationVersions.$inferSelect;
