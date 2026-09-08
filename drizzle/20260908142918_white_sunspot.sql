CREATE TABLE "novel_import_chapter_texts" (
	"chapter_id" uuid NOT NULL,
	"language" varchar(35) NOT NULL,
	"text_kind" varchar(16) NOT NULL,
	"translation_status" varchar(16) NOT NULL,
	"title" text,
	"content" text,
	"content_hash" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_import_chapter_texts_pk" PRIMARY KEY("chapter_id","language"),
	CONSTRAINT "novel_import_chapter_texts_language_format" CHECK ("novel_import_chapter_texts"."language" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "novel_import_chapter_texts_kind_valid" CHECK ("novel_import_chapter_texts"."text_kind" in ('source', 'translation')),
	CONSTRAINT "novel_import_chapter_texts_status_valid" CHECK ("novel_import_chapter_texts"."translation_status" in ('source', 'draft', 'reviewed', 'approved')),
	CONSTRAINT "novel_import_chapter_texts_kind_status_valid" CHECK (("novel_import_chapter_texts"."text_kind" = 'source' and "novel_import_chapter_texts"."translation_status" = 'source') or ("novel_import_chapter_texts"."text_kind" = 'translation' and "novel_import_chapter_texts"."translation_status" <> 'source')),
	CONSTRAINT "novel_import_chapter_texts_title_valid" CHECK ("novel_import_chapter_texts"."title" is null or length(btrim("novel_import_chapter_texts"."title")) > 0),
	CONSTRAINT "novel_import_chapter_texts_content_valid" CHECK (("novel_import_chapter_texts"."text_kind" = 'source' and length(btrim(coalesce("novel_import_chapter_texts"."title", ''))) > 0 and length(btrim(coalesce("novel_import_chapter_texts"."content", ''))) > 0) or ("novel_import_chapter_texts"."text_kind" = 'translation' and (length(btrim(coalesce("novel_import_chapter_texts"."title", ''))) > 0 or length(btrim(coalesce("novel_import_chapter_texts"."content", ''))) > 0))),
	CONSTRAINT "novel_import_chapter_texts_hash_format" CHECK ("novel_import_chapter_texts"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "novel_import_chapter_texts_version_positive" CHECK ("novel_import_chapter_texts"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "novel_import_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"chapter_number" integer NOT NULL,
	"source_url" text NOT NULL,
	"linked_chapter_id" uuid,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_import_chapters_number_positive" CHECK ("novel_import_chapters"."chapter_number" > 0),
	CONSTRAINT "novel_import_chapters_source_url_http" CHECK ("novel_import_chapters"."source_url" ~ '^https?://')
);
--> statement-breakpoint
CREATE TABLE "novel_import_source_texts" (
	"source_id" uuid NOT NULL,
	"language" varchar(35) NOT NULL,
	"text_kind" varchar(16) NOT NULL,
	"translation_status" varchar(16) NOT NULL,
	"title" text NOT NULL,
	"synopsis" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_import_source_texts_pk" PRIMARY KEY("source_id","language"),
	CONSTRAINT "novel_import_source_texts_language_format" CHECK ("novel_import_source_texts"."language" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "novel_import_source_texts_kind_valid" CHECK ("novel_import_source_texts"."text_kind" in ('source', 'translation')),
	CONSTRAINT "novel_import_source_texts_status_valid" CHECK ("novel_import_source_texts"."translation_status" in ('source', 'draft', 'reviewed', 'approved')),
	CONSTRAINT "novel_import_source_texts_kind_status_valid" CHECK (("novel_import_source_texts"."text_kind" = 'source' and "novel_import_source_texts"."translation_status" = 'source') or ("novel_import_source_texts"."text_kind" = 'translation' and "novel_import_source_texts"."translation_status" <> 'source')),
	CONSTRAINT "novel_import_source_texts_title_not_blank" CHECK (length(btrim("novel_import_source_texts"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "novel_import_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_work_id" varchar(256) NOT NULL,
	"import_reference" varchar(384) NOT NULL,
	"seed_url" text NOT NULL,
	"source_language" varchar(35) NOT NULL,
	"status" varchar(16) DEFAULT 'ready' NOT NULL,
	"blocked_reason" text,
	"linked_novel_id" uuid,
	"last_successful_chapter" integer,
	"next_probe_chapter" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_import_sources_provider_format" CHECK ("novel_import_sources"."provider" ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
	CONSTRAINT "novel_import_sources_work_id_not_blank" CHECK (length(btrim("novel_import_sources"."external_work_id")) > 0),
	CONSTRAINT "novel_import_sources_reference_not_blank" CHECK (length(btrim("novel_import_sources"."import_reference")) > 0),
	CONSTRAINT "novel_import_sources_seed_url_http" CHECK ("novel_import_sources"."seed_url" ~ '^https?://'),
	CONSTRAINT "novel_import_sources_language_format" CHECK ("novel_import_sources"."source_language" ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$'),
	CONSTRAINT "novel_import_sources_status_valid" CHECK ("novel_import_sources"."status" in ('ready', 'paused', 'blocked', 'error')),
	CONSTRAINT "novel_import_sources_block_reason_valid" CHECK (("novel_import_sources"."status" = 'blocked' and length(btrim(coalesce("novel_import_sources"."blocked_reason", ''))) > 0) or ("novel_import_sources"."status" <> 'blocked' and "novel_import_sources"."blocked_reason" is null)),
	CONSTRAINT "novel_import_sources_last_chapter_positive" CHECK ("novel_import_sources"."last_successful_chapter" is null or "novel_import_sources"."last_successful_chapter" > 0),
	CONSTRAINT "novel_import_sources_next_probe_positive" CHECK ("novel_import_sources"."next_probe_chapter" > 0)
);
--> statement-breakpoint
ALTER TABLE "novel_import_chapter_texts" ADD CONSTRAINT "novel_import_chapter_texts_chapter_id_novel_import_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."novel_import_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_import_chapters" ADD CONSTRAINT "novel_import_chapters_source_id_novel_import_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."novel_import_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_import_chapters" ADD CONSTRAINT "novel_import_chapters_linked_chapter_id_chapters_id_fk" FOREIGN KEY ("linked_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_import_source_texts" ADD CONSTRAINT "novel_import_source_texts_source_id_novel_import_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."novel_import_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_import_sources" ADD CONSTRAINT "novel_import_sources_linked_novel_id_novels_id_fk" FOREIGN KEY ("linked_novel_id") REFERENCES "public"."novels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "novel_import_chapter_texts_language_status_idx" ON "novel_import_chapter_texts" USING btree ("language","translation_status","chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_import_chapters_source_number_uidx" ON "novel_import_chapters" USING btree ("source_id","chapter_number");--> statement-breakpoint
CREATE INDEX "novel_import_chapters_source_fetched_idx" ON "novel_import_chapters" USING btree ("source_id","fetched_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "novel_import_chapters_linked_chapter_idx" ON "novel_import_chapters" USING btree ("linked_chapter_id");--> statement-breakpoint
CREATE INDEX "novel_import_source_texts_language_idx" ON "novel_import_source_texts" USING btree ("language","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_import_sources_provider_work_uidx" ON "novel_import_sources" USING btree ("provider","external_work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_import_sources_reference_uidx" ON "novel_import_sources" USING btree ("import_reference");--> statement-breakpoint
CREATE INDEX "novel_import_sources_status_updated_idx" ON "novel_import_sources" USING btree ("status","updated_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "novel_import_sources_linked_novel_idx" ON "novel_import_sources" USING btree ("linked_novel_id");