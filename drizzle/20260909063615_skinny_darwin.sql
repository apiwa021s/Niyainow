CREATE TABLE "translation_master_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataset" varchar(32) NOT NULL,
	"record_key" varchar(160) NOT NULL,
	"version" varchar(40) NOT NULL,
	"review_status" varchar(40) DEFAULT 'DRAFT_FOR_EDITOR_REVIEW' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"source_file" varchar(255) NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"imported_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_master_records_dataset_valid" CHECK ("translation_master_records"."dataset" in ('RESEARCH_EVIDENCE','GENRE_PROFILE','SCENE','GLOBAL_RULE','PRESET_RECIPE')),
	CONSTRAINT "translation_master_records_status_valid" CHECK ("translation_master_records"."review_status" in ('DRAFT_FOR_EDITOR_REVIEW','APPROVED','REJECTED','ARCHIVED')),
	CONSTRAINT "translation_master_records_hash_format" CHECK ("translation_master_records"."content_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "translation_master_records_active_approved" CHECK (not "translation_master_records"."is_active" or "translation_master_records"."review_status" = 'APPROVED')
);
--> statement-breakpoint
ALTER TABLE "translation_master_records" ADD CONSTRAINT "translation_master_records_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_master_records" ADD CONSTRAINT "translation_master_records_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "translation_master_records_identity_uidx" ON "translation_master_records" USING btree ("dataset","record_key","version");--> statement-breakpoint
CREATE INDEX "translation_master_records_runtime_idx" ON "translation_master_records" USING btree ("dataset","review_status","is_active");