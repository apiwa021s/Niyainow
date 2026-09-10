ALTER TABLE "translation_workspaces" ADD COLUMN "profile_generation_stage" varchar(32);--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD COLUMN "profile_generation_checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "translation_workspaces" ADD COLUMN "profile_generation_error" text;