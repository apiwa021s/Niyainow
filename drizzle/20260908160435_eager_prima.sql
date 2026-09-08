CREATE TABLE "translation_ai_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_item_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"context_snapshot_id" uuid,
	"provider_request_id" text,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_micros" bigint DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) NOT NULL,
	"error_code" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_ai_invocations_metrics_nonnegative" CHECK ("translation_ai_invocations"."input_tokens" >= 0 and "translation_ai_invocations"."output_tokens" >= 0 and "translation_ai_invocations"."cost_micros" >= 0 and "translation_ai_invocations"."latency_ms" >= 0),
	CONSTRAINT "translation_ai_invocations_status_valid" CHECK ("translation_ai_invocations"."status" in ('SUCCESS','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "translation_ai_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"provider" varchar(80) NOT NULL,
	"model_name" varchar(200) NOT NULL,
	"base_url" text NOT NULL,
	"api_key_env" varchar(120) NOT NULL,
	"input_cost_micros_per_million" bigint DEFAULT 0 NOT NULL,
	"output_cost_micros_per_million" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_ai_models_base_url_https" CHECK ("translation_ai_models"."base_url" ~ '^https://'),
	CONSTRAINT "translation_ai_models_env_format" CHECK ("translation_ai_models"."api_key_env" ~ '^AI_[A-Z0-9_]{1,116}$'),
	CONSTRAINT "translation_ai_models_cost_nonnegative" CHECK ("translation_ai_models"."input_cost_micros_per_million" >= 0 and "translation_ai_models"."output_cost_micros_per_million" >= 0)
);
--> statement-breakpoint
CREATE TABLE "translation_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"import_chapter_id" uuid NOT NULL,
	"source_snapshot_id" uuid NOT NULL,
	"linked_chapter_id" uuid,
	"chapter_number" integer NOT NULL,
	"status" varchar(24) DEFAULT 'READY' NOT NULL,
	"lock_version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_chapters_number_positive" CHECK ("translation_chapters"."chapter_number" > 0),
	CONSTRAINT "translation_chapters_status_valid" CHECK ("translation_chapters"."status" in ('READY','STALE','QUEUED','TRANSLATING','DRAFT','QA_FAILED','REVIEW','APPROVED','PUBLISHED','FAILED'))
);
--> statement-breakpoint
CREATE TABLE "translation_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"target_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"speaking_style" text,
	"is_locked" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_context_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_chapter_id" uuid NOT NULL,
	"profile_version" integer NOT NULL,
	"context_hash" varchar(64) NOT NULL,
	"context" jsonb NOT NULL,
	"estimated_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_context_hash_format" CHECK ("translation_context_snapshots"."context_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "translation_context_tokens_nonnegative" CHECK ("translation_context_snapshots"."estimated_tokens" >= 0)
);
--> statement-breakpoint
CREATE TABLE "translation_glossary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_term" text NOT NULL,
	"target_term" text NOT NULL,
	"note" text,
	"is_locked" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_glossary_terms_not_blank" CHECK (length(btrim("translation_glossary_entries"."source_term")) > 0 and length(btrim("translation_glossary_entries"."target_term")) > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"translation_chapter_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'QUEUED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	CONSTRAINT "translation_job_items_status_valid" CHECK ("translation_job_items"."status" in ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED')),
	CONSTRAINT "translation_job_items_attempts_nonnegative" CHECK ("translation_job_items"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "translation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"model_id" uuid NOT NULL,
	"prompt_version_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'QUEUED' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"requested_by" uuid,
	"total_items" integer DEFAULT 0 NOT NULL,
	"completed_items" integer DEFAULT 0 NOT NULL,
	"failed_items" integer DEFAULT 0 NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_jobs_status_valid" CHECK ("translation_jobs"."status" in ('QUEUED','RUNNING','COMPLETED','PARTIAL','FAILED','CANCELLED')),
	CONSTRAINT "translation_jobs_counts_valid" CHECK ("translation_jobs"."total_items" >= 0 and "translation_jobs"."completed_items" >= 0 and "translation_jobs"."failed_items" >= 0)
);
--> statement-breakpoint
CREATE TABLE "translation_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_profiles" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(160) DEFAULT 'Default' NOT NULL,
	"style_guide" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"preserve_paragraphs" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_profiles_version_positive" CHECK ("translation_profiles"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"version" integer NOT NULL,
	"system_prompt" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_prompt_versions_not_blank" CHECK (length(btrim("translation_prompt_versions"."system_prompt")) > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_qa_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_version_id" uuid NOT NULL,
	"code" varchar(80) NOT NULL,
	"severity" varchar(16) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_qa_issues_severity_valid" CHECK ("translation_qa_issues"."severity" in ('INFO','WARNING','CRITICAL'))
);
--> statement-breakpoint
CREATE TABLE "translation_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_version_id" uuid NOT NULL,
	"segment_index" integer NOT NULL,
	"source_segment_id" uuid,
	"content" text NOT NULL,
	CONSTRAINT "translation_segments_index_nonnegative" CHECK ("translation_segments"."segment_index" >= 0),
	CONSTRAINT "translation_segments_not_blank" CHECK (length(btrim("translation_segments"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_source_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_snapshot_id" uuid NOT NULL,
	"segment_index" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	CONSTRAINT "translation_source_segments_index_nonnegative" CHECK ("translation_source_segments"."segment_index" >= 0),
	CONSTRAINT "translation_source_segments_not_blank" CHECK (length(btrim("translation_source_segments"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_source_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"import_chapter_id" uuid NOT NULL,
	"source_language" varchar(35) NOT NULL,
	"source_version" integer NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"title" text,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_source_snapshots_hash_format" CHECK ("translation_source_snapshots"."source_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "translation_source_snapshots_content_not_blank" CHECK (length(btrim("translation_source_snapshots"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "translation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_chapter_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"parent_version_id" uuid,
	"context_snapshot_id" uuid,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" varchar(24) DEFAULT 'DRAFT' NOT NULL,
	"origin" varchar(16) DEFAULT 'MANUAL' NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_versions_revision_positive" CHECK ("translation_versions"."revision" > 0),
	CONSTRAINT "translation_versions_status_valid" CHECK ("translation_versions"."status" in ('DRAFT','APPROVED','SUPERSEDED','PUBLISHED','REJECTED')),
	CONSTRAINT "translation_versions_origin_valid" CHECK ("translation_versions"."origin" in ('MANUAL','AI')),
	CONSTRAINT "translation_versions_content_not_blank" CHECK (length(btrim("translation_versions"."title")) > 0 and length(btrim("translation_versions"."content")) > 0),
	CONSTRAINT "translation_versions_approval_valid" CHECK (("translation_versions"."status" not in ('APPROVED','PUBLISHED')) or ("translation_versions"."approved_by" is not null and "translation_versions"."approved_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "translation_workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_source_id" uuid NOT NULL,
	"novel_id" uuid,
	"source_language" varchar(35) NOT NULL,
	"target_language" varchar(35) NOT NULL,
	"status" varchar(24) DEFAULT 'SETUP' NOT NULL,
	"assigned_editor_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_workspaces_languages_differ" CHECK (lower("translation_workspaces"."source_language") <> lower("translation_workspaces"."target_language")),
	CONSTRAINT "translation_workspaces_language_format" CHECK ("translation_workspaces"."source_language" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and "translation_workspaces"."target_language" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "translation_workspaces_status_valid" CHECK ("translation_workspaces"."status" in ('SETUP','READY','TRANSLATING','REVIEW','COMPLETED','PAUSED')),
	CONSTRAINT "translation_workspaces_version_positive" CHECK ("translation_workspaces"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "translation_ai_invocations" ADD CONSTRAINT "translation_ai_invocations_job_item_id_translation_job_items_id_fk" FOREIGN KEY ("job_item_id") REFERENCES "public"."translation_job_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_ai_invocations" ADD CONSTRAINT "translation_ai_invocations_model_id_translation_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."translation_ai_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_ai_invocations" ADD CONSTRAINT "translation_ai_invocations_context_snapshot_id_translation_context_snapshots_id_fk" FOREIGN KEY ("context_snapshot_id") REFERENCES "public"."translation_context_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_ai_models" ADD CONSTRAINT "translation_ai_models_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_chapters" ADD CONSTRAINT "translation_chapters_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_chapters" ADD CONSTRAINT "translation_chapters_import_chapter_id_novel_import_chapters_id_fk" FOREIGN KEY ("import_chapter_id") REFERENCES "public"."novel_import_chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_chapters" ADD CONSTRAINT "translation_chapters_source_snapshot_id_translation_source_snapshots_id_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "public"."translation_source_snapshots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_chapters" ADD CONSTRAINT "translation_chapters_linked_chapter_id_chapters_id_fk" FOREIGN KEY ("linked_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_characters" ADD CONSTRAINT "translation_characters_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_characters" ADD CONSTRAINT "translation_characters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_context_snapshots" ADD CONSTRAINT "translation_context_snapshots_translation_chapter_id_translation_chapters_id_fk" FOREIGN KEY ("translation_chapter_id") REFERENCES "public"."translation_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_glossary_entries" ADD CONSTRAINT "translation_glossary_entries_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_glossary_entries" ADD CONSTRAINT "translation_glossary_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_job_items" ADD CONSTRAINT "translation_job_items_job_id_translation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."translation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_job_items" ADD CONSTRAINT "translation_job_items_translation_chapter_id_translation_chapters_id_fk" FOREIGN KEY ("translation_chapter_id") REFERENCES "public"."translation_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_model_id_translation_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."translation_ai_models"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_prompt_version_id_translation_prompt_versions_id_fk" FOREIGN KEY ("prompt_version_id") REFERENCES "public"."translation_prompt_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_jobs" ADD CONSTRAINT "translation_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_profile_versions" ADD CONSTRAINT "translation_profile_versions_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_profile_versions" ADD CONSTRAINT "translation_profile_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_profiles" ADD CONSTRAINT "translation_profiles_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_profiles" ADD CONSTRAINT "translation_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_prompt_versions" ADD CONSTRAINT "translation_prompt_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_qa_issues" ADD CONSTRAINT "translation_qa_issues_translation_version_id_translation_versions_id_fk" FOREIGN KEY ("translation_version_id") REFERENCES "public"."translation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_qa_issues" ADD CONSTRAINT "translation_qa_issues_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_segments" ADD CONSTRAINT "translation_segments_translation_version_id_translation_versions_id_fk" FOREIGN KEY ("translation_version_id") REFERENCES "public"."translation_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_segments" ADD CONSTRAINT "translation_segments_source_segment_id_translation_source_segments_id_fk" FOREIGN KEY ("source_segment_id") REFERENCES "public"."translation_source_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_source_segments" ADD CONSTRAINT "translation_source_segments_source_snapshot_id_translation_source_snapshots_id_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "public"."translation_source_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_source_snapshots" ADD CONSTRAINT "translation_source_snapshots_workspace_id_translation_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."translation_workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_source_snapshots" ADD CONSTRAINT "translation_source_snapshots_import_chapter_id_novel_import_chapters_id_fk" FOREIGN KEY ("import_chapter_id") REFERENCES "public"."novel_import_chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_translation_chapter_id_translation_chapters_id_fk" FOREIGN KEY ("translation_chapter_id") REFERENCES "public"."translation_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_context_snapshot_id_translation_context_snapshots_id_fk" FOREIGN KEY ("context_snapshot_id") REFERENCES "public"."translation_context_snapshots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_versions" ADD CONSTRAINT "translation_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD CONSTRAINT "translation_workspaces_import_source_id_novel_import_sources_id_fk" FOREIGN KEY ("import_source_id") REFERENCES "public"."novel_import_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD CONSTRAINT "translation_workspaces_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD CONSTRAINT "translation_workspaces_assigned_editor_id_users_id_fk" FOREIGN KEY ("assigned_editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD CONSTRAINT "translation_workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "translation_ai_invocations_item_idx" ON "translation_ai_invocations" USING btree ("job_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_ai_models_provider_model_uidx" ON "translation_ai_models" USING btree ("provider","model_name");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_chapters_workspace_import_uidx" ON "translation_chapters" USING btree ("workspace_id","import_chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_chapters_workspace_number_uidx" ON "translation_chapters" USING btree ("workspace_id","chapter_number");--> statement-breakpoint
CREATE INDEX "translation_chapters_workspace_status_idx" ON "translation_chapters" USING btree ("workspace_id","status","chapter_number");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_characters_workspace_source_uidx" ON "translation_characters" USING btree ("workspace_id",lower("source_name"));--> statement-breakpoint
CREATE INDEX "translation_characters_workspace_locked_idx" ON "translation_characters" USING btree ("workspace_id","is_locked");--> statement-breakpoint
CREATE INDEX "translation_context_chapter_created_idx" ON "translation_context_snapshots" USING btree ("translation_chapter_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "translation_glossary_workspace_source_uidx" ON "translation_glossary_entries" USING btree ("workspace_id",lower("source_term"));--> statement-breakpoint
CREATE INDEX "translation_glossary_workspace_locked_idx" ON "translation_glossary_entries" USING btree ("workspace_id","is_locked");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_job_items_job_chapter_uidx" ON "translation_job_items" USING btree ("job_id","translation_chapter_id");--> statement-breakpoint
CREATE INDEX "translation_job_items_claim_idx" ON "translation_job_items" USING btree ("status","available_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_jobs_idempotency_uidx" ON "translation_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "translation_jobs_claim_idx" ON "translation_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "translation_jobs_workspace_created_idx" ON "translation_jobs" USING btree ("workspace_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "translation_profile_versions_workspace_version_uidx" ON "translation_profile_versions" USING btree ("workspace_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_prompt_versions_name_version_uidx" ON "translation_prompt_versions" USING btree ("name","version");--> statement-breakpoint
CREATE INDEX "translation_qa_issues_version_severity_idx" ON "translation_qa_issues" USING btree ("translation_version_id","severity","resolved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_segments_version_index_uidx" ON "translation_segments" USING btree ("translation_version_id","segment_index");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_source_segments_snapshot_index_uidx" ON "translation_source_segments" USING btree ("source_snapshot_id","segment_index");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_source_snapshots_identity_uidx" ON "translation_source_snapshots" USING btree ("workspace_id","import_chapter_id","source_hash");--> statement-breakpoint
CREATE INDEX "translation_source_snapshots_workspace_chapter_idx" ON "translation_source_snapshots" USING btree ("workspace_id","import_chapter_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "translation_versions_chapter_revision_uidx" ON "translation_versions" USING btree ("translation_chapter_id","revision");--> statement-breakpoint
CREATE INDEX "translation_versions_chapter_status_idx" ON "translation_versions" USING btree ("translation_chapter_id","status","revision" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "translation_workspaces_source_target_uidx" ON "translation_workspaces" USING btree ("import_source_id","target_language");--> statement-breakpoint
CREATE INDEX "translation_workspaces_status_updated_idx" ON "translation_workspaces" USING btree ("status","updated_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "translation_workspaces_novel_idx" ON "translation_workspaces" USING btree ("novel_id");