CREATE TABLE "domain_outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(80) NOT NULL,
	"aggregate_type" varchar(80) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_outbox_events_status_valid" CHECK ("domain_outbox_events"."status" in ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
	CONSTRAINT "domain_outbox_events_attempts_nonnegative" CHECK ("domain_outbox_events"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "domain_outbox_events_dedupe_uidx" ON "domain_outbox_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "domain_outbox_events_pending_idx" ON "domain_outbox_events" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_user_dedupe_uidx" ON "notifications" USING btree ("user_id","dedupe_key") WHERE "notifications"."dedupe_key" is not null;