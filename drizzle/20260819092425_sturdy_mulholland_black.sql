ALTER TABLE "users" ADD COLUMN "reader_prefs" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reader_prefs_updated_at" timestamp with time zone;