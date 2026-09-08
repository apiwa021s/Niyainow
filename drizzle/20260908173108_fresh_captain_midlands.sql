ALTER TABLE "translation_job_items" ADD COLUMN "progress_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_job_items" ADD COLUMN "progress_stage" varchar(24) DEFAULT 'QUEUED' NOT NULL;--> statement-breakpoint
UPDATE "translation_job_items"
SET
  "progress_percent" = CASE WHEN "status" IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN 100 WHEN "status" = 'RUNNING' THEN 35 ELSE 0 END,
  "progress_stage" = CASE WHEN "status" = 'COMPLETED' THEN 'DONE' WHEN "status" = 'FAILED' THEN 'FAILED' WHEN "status" = 'CANCELLED' THEN 'CANCELLED' WHEN "status" = 'RUNNING' THEN 'AI_REQUEST' ELSE 'QUEUED' END;--> statement-breakpoint
ALTER TABLE "translation_job_items" ADD CONSTRAINT "translation_job_items_progress_valid" CHECK ("translation_job_items"."progress_percent" between 0 and 100);--> statement-breakpoint
ALTER TABLE "translation_job_items" ADD CONSTRAINT "translation_job_items_stage_valid" CHECK ("translation_job_items"."progress_stage" in ('QUEUED','CONTEXT','AI_REQUEST','QA','SAVING','DONE','FAILED','CANCELLED'));
