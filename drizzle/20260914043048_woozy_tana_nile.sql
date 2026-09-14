CREATE TABLE "reader_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" varchar(32),
	"event_type" varchar(64) NOT NULL,
	"exp_delta" integer DEFAULT 0 NOT NULL,
	"idempotency_key" varchar(160) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_activity_events_class_valid" CHECK (class_id is null or class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_activity_events_type_valid" CHECK ("reader_activity_events"."event_type" ~ '^[a-z][a-z0-9_.-]{2,63}$'),
	CONSTRAINT "reader_activity_events_exp_delta_bounded" CHECK ("reader_activity_events"."exp_delta" between -100000 and 100000),
	CONSTRAINT "reader_activity_events_metadata_object" CHECK (jsonb_typeof("reader_activity_events"."metadata") = 'object')
);
--> statement-breakpoint
CREATE TABLE "reader_class_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"profile_version" smallint DEFAULT 1 NOT NULL,
	"main_class_id" varchar(32) NOT NULL,
	"sub_class_id" varchar(32) NOT NULL,
	"selected_class_ids" jsonb NOT NULL,
	"quiz_answers" jsonb NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_class_profiles_version_valid" CHECK ("reader_class_profiles"."profile_version" = 1),
	CONSTRAINT "reader_class_profiles_main_class_valid" CHECK (main_class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_class_profiles_sub_class_valid" CHECK (sub_class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_class_profiles_classes_distinct" CHECK ("reader_class_profiles"."main_class_id" <> "reader_class_profiles"."sub_class_id"),
	CONSTRAINT "reader_class_profiles_selected_classes_valid" CHECK (jsonb_typeof("reader_class_profiles"."selected_class_ids") = 'array' and jsonb_array_length("reader_class_profiles"."selected_class_ids") = 3),
	CONSTRAINT "reader_class_profiles_answers_object" CHECK (jsonb_typeof("reader_class_profiles"."quiz_answers") = 'object')
);
--> statement-breakpoint
CREATE TABLE "reader_class_progress" (
	"user_id" uuid NOT NULL,
	"class_id" varchar(32) NOT NULL,
	"total_exp" integer DEFAULT 0 NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_exp_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_class_progress_pk" PRIMARY KEY("user_id","class_id"),
	CONSTRAINT "reader_class_progress_class_valid" CHECK (class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_class_progress_exp_nonnegative" CHECK ("reader_class_progress"."total_exp" >= 0)
);
--> statement-breakpoint
ALTER TABLE "reader_activity_events" ADD CONSTRAINT "reader_activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ADD CONSTRAINT "reader_class_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_class_progress" ADD CONSTRAINT "reader_class_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reader_activity_events_user_idempotency_uidx" ON "reader_activity_events" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "reader_activity_events_user_occurred_idx" ON "reader_activity_events" USING btree ("user_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_activity_events_class_occurred_idx" ON "reader_activity_events" USING btree ("class_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_class_profiles_main_class_idx" ON "reader_class_profiles" USING btree ("main_class_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_class_profiles_sub_class_idx" ON "reader_class_profiles" USING btree ("sub_class_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_class_progress_user_exp_idx" ON "reader_class_progress" USING btree ("user_id","total_exp" DESC NULLS LAST,"class_id");