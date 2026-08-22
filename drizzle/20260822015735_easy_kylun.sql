CREATE TABLE "membership_benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name_th" varchar(160) NOT NULL,
	"name_en" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_benefits_slug_format" CHECK ("membership_benefits"."slug" ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "writer_membership_plan_benefits" (
	"membership_plan_id" uuid NOT NULL,
	"benefit_id" uuid NOT NULL,
	CONSTRAINT "writer_membership_plan_benefits_pk" PRIMARY KEY("membership_plan_id","benefit_id")
);
--> statement-breakpoint
CREATE TABLE "writer_profile_tags" (
	"writer_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "writer_profile_tags_pk" PRIMARY KEY("writer_id","tag_id"),
	CONSTRAINT "writer_profile_tags_sort_nonnegative" CHECK ("writer_profile_tags"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "creator_revenue_events" ADD COLUMN "reversal_of_revenue_event_id" uuid;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD COLUMN "refund_ledger_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "writer_membership_plan_benefits" ADD CONSTRAINT "writer_membership_plan_benefits_membership_plan_id_writer_membership_plans_id_fk" FOREIGN KEY ("membership_plan_id") REFERENCES "public"."writer_membership_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_membership_plan_benefits" ADD CONSTRAINT "writer_membership_plan_benefits_benefit_id_membership_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."membership_benefits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_profile_tags" ADD CONSTRAINT "writer_profile_tags_writer_id_writer_profiles_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."writer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "writer_profile_tags" ADD CONSTRAINT "writer_profile_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "membership_benefits_slug_uidx" ON "membership_benefits" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "membership_benefits_active_order_idx" ON "membership_benefits" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "writer_membership_plan_benefits_benefit_idx" ON "writer_membership_plan_benefits" USING btree ("benefit_id","membership_plan_id");--> statement-breakpoint
CREATE INDEX "writer_profile_tags_tag_writer_idx" ON "writer_profile_tags" USING btree ("tag_id","writer_id");--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_refund_ledger_entry_id_coin_ledger_entries_id_fk" FOREIGN KEY ("refund_ledger_entry_id") REFERENCES "public"."coin_ledger_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_revenue_events_one_reversal_uidx" ON "creator_revenue_events" USING btree ("reversal_of_revenue_event_id") WHERE "creator_revenue_events"."reversal_of_revenue_event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_unlocks_refund_ledger_entry_uidx" ON "chapter_unlocks" USING btree ("refund_ledger_entry_id") WHERE "chapter_unlocks"."refund_ledger_entry_id" is not null;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_refund_state_valid" CHECK (("chapter_unlocks"."refunded_at" is null and "chapter_unlocks"."refund_ledger_entry_id" is null) or ("chapter_unlocks"."refunded_at" is not null and "chapter_unlocks"."refund_ledger_entry_id" is not null));