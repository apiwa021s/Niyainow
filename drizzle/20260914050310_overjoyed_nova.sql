CREATE TABLE "novel_class_affinities" (
	"novel_id" uuid NOT NULL,
	"class_id" varchar(32) NOT NULL,
	"weight_milli" smallint NOT NULL,
	"source" varchar(24) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_class_affinities_pk" PRIMARY KEY("novel_id","class_id"),
	CONSTRAINT "novel_class_affinities_class_valid" CHECK (class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "novel_class_affinities_weight_valid" CHECK ("novel_class_affinities"."weight_milli" between 1 and 1000),
	CONSTRAINT "novel_class_affinities_source_valid" CHECK ("novel_class_affinities"."source" in ('manual', 'import', 'inferred'))
);
--> statement-breakpoint
CREATE TABLE "reader_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"total_exp" integer DEFAULT 0 NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_qualified_read_date" date,
	"streak_freezes_available" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_accounts_exp_nonnegative" CHECK ("reader_accounts"."total_exp" >= 0),
	CONSTRAINT "reader_accounts_streak_nonnegative" CHECK ("reader_accounts"."current_streak_days" >= 0 and "reader_accounts"."longest_streak_days" >= 0),
	CONSTRAINT "reader_accounts_freezes_nonnegative" CHECK ("reader_accounts"."streak_freezes_available" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reader_chapter_qualifications" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"qualified_read_count" smallint DEFAULT 0 NOT NULL,
	"reader_exp_awarded" integer DEFAULT 0 NOT NULL,
	"class_exp_awarded_milli" integer DEFAULT 0 NOT NULL,
	"first_qualified_at" timestamp with time zone NOT NULL,
	"last_qualified_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reader_chapter_qualifications_pk" PRIMARY KEY("user_id","chapter_id"),
	CONSTRAINT "reader_chapter_qualifications_count_nonnegative" CHECK ("reader_chapter_qualifications"."qualified_read_count" >= 0),
	CONSTRAINT "reader_chapter_qualifications_exp_nonnegative" CHECK ("reader_chapter_qualifications"."reader_exp_awarded" >= 0 and "reader_chapter_qualifications"."class_exp_awarded_milli" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reader_class_exp_entries" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" varchar(32) NOT NULL,
	"exp_milli" integer NOT NULL,
	"affinity_weight_milli" smallint NOT NULL,
	"main_class_bonus_bps" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_class_exp_entries_pk" PRIMARY KEY("event_id","class_id"),
	CONSTRAINT "reader_class_exp_entries_class_valid" CHECK (class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_class_exp_entries_exp_nonnegative" CHECK ("reader_class_exp_entries"."exp_milli" >= 0),
	CONSTRAINT "reader_class_exp_entries_affinity_valid" CHECK ("reader_class_exp_entries"."affinity_weight_milli" between 1 and 1000),
	CONSTRAINT "reader_class_exp_entries_bonus_valid" CHECK ("reader_class_exp_entries"."main_class_bonus_bps" in (0, 1000))
);
--> statement-breakpoint
CREATE TABLE "reader_daily_progress" (
	"user_id" uuid NOT NULL,
	"activity_date" date NOT NULL,
	"reading_exp_awarded" integer DEFAULT 0 NOT NULL,
	"qualified_chapter_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_daily_progress_pk" PRIMARY KEY("user_id","activity_date"),
	CONSTRAINT "reader_daily_progress_exp_cap" CHECK ("reader_daily_progress"."reading_exp_awarded" between 0 and 500),
	CONSTRAINT "reader_daily_progress_count_nonnegative" CHECK ("reader_daily_progress"."qualified_chapter_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reader_reading_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"max_progress_basis_points" integer DEFAULT 0 NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	"sample_count" integer DEFAULT 0 NOT NULL,
	"suspicious_reason" varchar(80),
	"qualified_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sample_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_reading_sessions_progress_valid" CHECK ("reader_reading_sessions"."max_progress_basis_points" between 0 and 10000),
	CONSTRAINT "reader_reading_sessions_active_nonnegative" CHECK ("reader_reading_sessions"."active_seconds" >= 0),
	CONSTRAINT "reader_reading_sessions_samples_nonnegative" CHECK ("reader_reading_sessions"."sample_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "reader_activity_events" RENAME COLUMN "exp_delta" TO "reader_exp_delta";--> statement-breakpoint
ALTER TABLE "reader_class_progress" RENAME COLUMN "total_exp" TO "total_exp_milli";--> statement-breakpoint
UPDATE "reader_class_progress" SET "total_exp_milli" = "total_exp_milli" * 1000;--> statement-breakpoint
ALTER TABLE "reader_activity_events" DROP CONSTRAINT "reader_activity_events_class_valid";--> statement-breakpoint
ALTER TABLE "reader_activity_events" DROP CONSTRAINT "reader_activity_events_exp_delta_bounded";--> statement-breakpoint
ALTER TABLE "reader_class_profiles" DROP CONSTRAINT "reader_class_profiles_version_valid";--> statement-breakpoint
ALTER TABLE "reader_class_progress" DROP CONSTRAINT "reader_class_progress_exp_nonnegative";--> statement-breakpoint
DROP INDEX "reader_activity_events_class_occurred_idx";--> statement-breakpoint
DROP INDEX "reader_class_progress_user_exp_idx";--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ALTER COLUMN "profile_version" SET DEFAULT 2;--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ADD COLUMN "sub_class_ids" jsonb;--> statement-breakpoint
UPDATE "reader_class_profiles" AS profile
SET "sub_class_ids" = jsonb_build_array(
	profile."sub_class_id",
	(
		SELECT selected.value
		FROM jsonb_array_elements_text(profile."selected_class_ids") AS selected(value)
		WHERE selected.value <> profile."main_class_id"
			AND selected.value <> profile."sub_class_id"
		LIMIT 1
	)
), "profile_version" = 2;--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ALTER COLUMN "sub_class_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reader_class_progress" ADD COLUMN "prestige" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "novel_class_affinities" ADD CONSTRAINT "novel_class_affinities_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_accounts" ADD CONSTRAINT "reader_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_chapter_qualifications" ADD CONSTRAINT "reader_chapter_qualifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_chapter_qualifications" ADD CONSTRAINT "reader_chapter_qualifications_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_chapter_qualifications" ADD CONSTRAINT "reader_chapter_qualifications_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_class_exp_entries" ADD CONSTRAINT "reader_class_exp_entries_event_id_reader_activity_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."reader_activity_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_class_exp_entries" ADD CONSTRAINT "reader_class_exp_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_daily_progress" ADD CONSTRAINT "reader_daily_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_reading_sessions" ADD CONSTRAINT "reader_reading_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_reading_sessions" ADD CONSTRAINT "reader_reading_sessions_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_reading_sessions" ADD CONSTRAINT "reader_reading_sessions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "reader_accounts" ("user_id")
SELECT "user_id" FROM "reader_class_profiles"
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
CREATE INDEX "novel_class_affinities_class_idx" ON "novel_class_affinities" USING btree ("class_id","weight_milli" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "reader_accounts_exp_idx" ON "reader_accounts" USING btree ("total_exp" DESC NULLS LAST,"user_id");--> statement-breakpoint
CREATE INDEX "reader_chapter_qualifications_user_novel_idx" ON "reader_chapter_qualifications" USING btree ("user_id","novel_id","last_qualified_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_class_exp_entries_user_class_idx" ON "reader_class_exp_entries" USING btree ("user_id","class_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_daily_progress_date_exp_idx" ON "reader_daily_progress" USING btree ("activity_date","reading_exp_awarded" DESC NULLS LAST,"user_id");--> statement-breakpoint
CREATE INDEX "reader_reading_sessions_user_chapter_idx" ON "reader_reading_sessions" USING btree ("user_id","chapter_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_reading_sessions_unqualified_idx" ON "reader_reading_sessions" USING btree ("user_id","last_sample_at") WHERE "reader_reading_sessions"."qualified_at" is null;--> statement-breakpoint
CREATE INDEX "reader_class_progress_user_exp_idx" ON "reader_class_progress" USING btree ("user_id","total_exp_milli" DESC NULLS LAST,"class_id");--> statement-breakpoint
ALTER TABLE "reader_activity_events" DROP COLUMN "class_id";--> statement-breakpoint
ALTER TABLE "reader_activity_events" ADD CONSTRAINT "reader_activity_events_exp_delta_bounded" CHECK ("reader_activity_events"."reader_exp_delta" between -100000 and 100000);--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ADD CONSTRAINT "reader_class_profiles_sub_classes_valid" CHECK (jsonb_typeof("reader_class_profiles"."sub_class_ids") = 'array' and jsonb_array_length("reader_class_profiles"."sub_class_ids") = 2);--> statement-breakpoint
ALTER TABLE "reader_class_profiles" ADD CONSTRAINT "reader_class_profiles_version_valid" CHECK ("reader_class_profiles"."profile_version" between 1 and 2);--> statement-breakpoint
ALTER TABLE "reader_class_progress" ADD CONSTRAINT "reader_class_progress_prestige_nonnegative" CHECK ("reader_class_progress"."prestige" >= 0);--> statement-breakpoint
ALTER TABLE "reader_class_progress" ADD CONSTRAINT "reader_class_progress_exp_nonnegative" CHECK ("reader_class_progress"."total_exp_milli" >= 0);
