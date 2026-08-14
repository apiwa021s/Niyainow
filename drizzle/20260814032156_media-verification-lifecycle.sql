ALTER TYPE "public"."media_status" ADD VALUE 'VERIFYING' BEFORE 'READY';--> statement-breakpoint
CREATE INDEX "media_assets_status_updated_idx" ON "media_assets" USING btree ("status","updated_at");
