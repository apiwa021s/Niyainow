CREATE EXTENSION IF NOT EXISTS "pg_trgm";--> statement-breakpoint
CREATE TYPE "public"."author_role" AS ENUM('AUTHOR', 'ORIGINAL_AUTHOR', 'TRANSLATOR', 'EDITOR');--> statement-breakpoint
CREATE TYPE "public"."chapter_status" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."content_rating" AS ENUM('EVERYONE', 'TEEN', 'MATURE', 'ADULT');--> statement-breakpoint
CREATE TYPE "public"."library_status" AS ENUM('READING', 'PLAN_TO_READ', 'COMPLETED', 'DROPPED');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('COVER', 'BANNER', 'AVATAR', 'NOVEL_ASSET', 'OG');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('PENDING', 'READY', 'FAILED', 'ORPHANED');--> statement-breakpoint
CREATE TYPE "public"."novel_status" AS ENUM('ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."ranking_period" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('READER', 'EDITOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" "user_role",
	"action" varchar(120) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(120),
	"ip_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"kind" "media_kind" NOT NULL,
	"status" "media_status" DEFAULT 'PENDING' NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" bigint NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"etag" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "media_assets_object_key_valid" CHECK ("media_assets"."object_key" !~ '://' and left("media_assets"."object_key", 1) <> '/' and "media_assets"."object_key" !~ '\\' and "media_assets"."object_key" !~ '(^|/)\.\.(/|$)'),
	CONSTRAINT "media_assets_byte_size_positive" CHECK ("media_assets"."byte_size" > 0),
	CONSTRAINT "media_assets_dimensions_positive" CHECK (("media_assets"."width" is null or "media_assets"."width" > 0) and ("media_assets"."height" is null or "media_assets"."height" > 0)),
	CONSTRAINT "media_assets_content_type_allowed" CHECK ("media_assets"."content_type" in ('image/jpeg', 'image/png', 'image/webp', 'image/avif'))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" varchar(160) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_format" CHECK ("site_settings"."key" ~ '^[a-z][a-z0-9_.-]{1,159}$')
);
--> statement-breakpoint
CREATE TABLE "novel_daily_stats" (
	"novel_id" uuid NOT NULL,
	"stat_date" date NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"unique_readers" bigint DEFAULT 0 NOT NULL,
	"chapter_reads" bigint DEFAULT 0 NOT NULL,
	"chapter_completions" bigint DEFAULT 0 NOT NULL,
	"library_adds" integer DEFAULT 0 NOT NULL,
	"follows" integer DEFAULT 0 NOT NULL,
	"ratings" integer DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_daily_stats_pk" PRIMARY KEY("novel_id","stat_date"),
	CONSTRAINT "novel_daily_stats_nonnegative" CHECK ("novel_daily_stats"."views" >= 0 and "novel_daily_stats"."unique_readers" >= 0 and "novel_daily_stats"."chapter_reads" >= 0 and "novel_daily_stats"."chapter_completions" >= 0 and "novel_daily_stats"."library_adds" >= 0 and "novel_daily_stats"."follows" >= 0 and "novel_daily_stats"."ratings" >= 0 and "novel_daily_stats"."reviews" >= 0),
	CONSTRAINT "novel_daily_stats_unique_lte_views" CHECK ("novel_daily_stats"."unique_readers" <= "novel_daily_stats"."views"),
	CONSTRAINT "novel_daily_stats_completions_lte_reads" CHECK ("novel_daily_stats"."chapter_completions" <= "novel_daily_stats"."chapter_reads")
);
--> statement-breakpoint
CREATE TABLE "novel_rankings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"novel_id" uuid NOT NULL,
	"period" "ranking_period" NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"rank" integer NOT NULL,
	"score" numeric(20, 6) NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL,
	"unique_readers" bigint DEFAULT 0 NOT NULL,
	"chapter_reads" bigint DEFAULT 0 NOT NULL,
	"library_adds" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_rankings_rank_positive" CHECK ("novel_rankings"."rank" > 0),
	CONSTRAINT "novel_rankings_period_valid" CHECK ("novel_rankings"."period_end" >= "novel_rankings"."period_start"),
	CONSTRAINT "novel_rankings_metrics_nonnegative" CHECK ("novel_rankings"."views" >= 0 and "novel_rankings"."unique_readers" >= 0 and "novel_rankings"."chapter_reads" >= 0 and "novel_rankings"."library_adds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_account_pk" PRIMARY KEY("provider","provider_account_id"),
	CONSTRAINT "accounts_google_only" CHECK ("accounts"."provider" = 'google')
);
--> statement-breakpoint
CREATE TABLE "authenticators" (
	"credential_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_account_id" text NOT NULL,
	"credential_public_key" text NOT NULL,
	"counter" integer NOT NULL,
	"credential_device_type" text NOT NULL,
	"credential_backed_up" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "authenticators_user_credential_pk" PRIMARY KEY("user_id","credential_id"),
	CONSTRAINT "authenticators_credential_id_unique" UNIQUE("credential_id"),
	CONSTRAINT "authenticators_counter_nonnegative" CHECK ("authenticators"."counter" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_id" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"name" text,
	"image" text,
	"avatar_key" text,
	"role" "user_role" DEFAULT 'READER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_avatar_key_is_object_key" CHECK ("users"."avatar_key" is null or ("users"."avatar_key" !~ '://' and left("users"."avatar_key", 1) <> '/')),
	CONSTRAINT "users_deleted_status_consistent" CHECK (("users"."status" = 'DELETED') = ("users"."deleted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" text NOT NULL,
	"native_name" text,
	"bio" text,
	"avatar_key" text,
	"website" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authors_avatar_key_is_object_key" CHECK ("authors"."avatar_key" is null or ("authors"."avatar_key" !~ '://' and left("authors"."avatar_key", 1) <> '/')),
	CONSTRAINT "authors_slug_format" CHECK ("authors"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"novel_id" uuid NOT NULL,
	"chapter_number" numeric(10, 2) NOT NULL,
	"sort_order" integer NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"excerpt" text,
	"word_count" integer DEFAULT 0 NOT NULL,
	"status" "chapter_status" DEFAULT 'DRAFT' NOT NULL,
	"is_free" boolean DEFAULT true NOT NULL,
	"coin_price" integer DEFAULT 0 NOT NULL,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chapters_number_nonnegative" CHECK ("chapters"."chapter_number" >= 0),
	CONSTRAINT "chapters_sort_order_positive" CHECK ("chapters"."sort_order" > 0),
	CONSTRAINT "chapters_word_count_nonnegative" CHECK ("chapters"."word_count" >= 0),
	CONSTRAINT "chapters_coin_price_nonnegative" CHECK ("chapters"."coin_price" >= 0),
	CONSTRAINT "chapters_free_price_consistent" CHECK (("chapters"."is_free" and "chapters"."coin_price" = 0) or (not "chapters"."is_free" and "chapters"."coin_price" > 0)),
	CONSTRAINT "chapters_publication_dates_valid" CHECK (("chapters"."status" <> 'PUBLISHED' or "chapters"."published_at" is not null) and ("chapters"."status" <> 'SCHEDULED' or "chapters"."scheduled_for" is not null)),
	CONSTRAINT "chapters_published_content_not_blank" CHECK ("chapters"."status" <> 'PUBLISHED' or length(btrim("chapters"."content")) > 0),
	CONSTRAINT "chapters_slug_format" CHECK ("chapters"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"thai_name" varchar(160),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "genres_slug_format" CHECK ("genres"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "novel_alternative_titles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"novel_id" uuid NOT NULL,
	"title" text NOT NULL,
	"language" varchar(16)
);
--> statement-breakpoint
CREATE TABLE "novel_authors" (
	"novel_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"role" "author_role" DEFAULT 'AUTHOR' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "novel_authors_pk" PRIMARY KEY("novel_id","author_id","role")
);
--> statement-breakpoint
CREATE TABLE "novel_genres" (
	"novel_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "novel_genres_pk" PRIMARY KEY("novel_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "novel_search_documents" (
	"novel_id" uuid PRIMARY KEY NOT NULL,
	"search_text" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_search_documents_not_blank" CHECK (length(btrim("novel_search_documents"."search_text")) > 0)
);
--> statement-breakpoint
CREATE TABLE "novel_statistics" (
	"novel_id" uuid PRIMARY KEY NOT NULL,
	"latest_chapter_id" uuid,
	"total_chapters" integer DEFAULT 0 NOT NULL,
	"published_chapters" integer DEFAULT 0 NOT NULL,
	"view_count" bigint DEFAULT 0 NOT NULL,
	"library_count" integer DEFAULT 0 NOT NULL,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"rating_average" numeric(3, 2) DEFAULT 0 NOT NULL,
	"rating_sum" bigint DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"latest_chapter_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_statistics_total_nonnegative" CHECK ("novel_statistics"."total_chapters" >= 0 and "novel_statistics"."published_chapters" >= 0 and "novel_statistics"."published_chapters" <= "novel_statistics"."total_chapters"),
	CONSTRAINT "novel_statistics_counts_nonnegative" CHECK ("novel_statistics"."view_count" >= 0 and "novel_statistics"."library_count" >= 0 and "novel_statistics"."follower_count" >= 0 and "novel_statistics"."rating_sum" >= 0 and "novel_statistics"."rating_count" >= 0 and "novel_statistics"."review_count" >= 0),
	CONSTRAINT "novel_statistics_rating_range" CHECK ("novel_statistics"."rating_average" >= 0 and "novel_statistics"."rating_average" <= 5),
	CONSTRAINT "novel_statistics_rating_sum_valid" CHECK ("novel_statistics"."rating_sum" <= "novel_statistics"."rating_count" * 5)
);
--> statement-breakpoint
CREATE TABLE "novel_tags" (
	"novel_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "novel_tags_pk" PRIMARY KEY("novel_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "novels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"title" text NOT NULL,
	"title_original" text,
	"synopsis" text NOT NULL,
	"synopsis_original" text,
	"cover_key" text,
	"banner_key" text,
	"original_language" varchar(16),
	"language" varchar(16) DEFAULT 'th' NOT NULL,
	"status" "novel_status" DEFAULT 'ONGOING' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'DRAFT' NOT NULL,
	"content_rating" "content_rating" DEFAULT 'TEEN' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"latest_chapter_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "novels_cover_key_is_object_key" CHECK ("novels"."cover_key" is null or ("novels"."cover_key" !~ '://' and left("novels"."cover_key", 1) <> '/')),
	CONSTRAINT "novels_banner_key_is_object_key" CHECK ("novels"."banner_key" is null or ("novels"."banner_key" !~ '://' and left("novels"."banner_key", 1) <> '/')),
	CONSTRAINT "novels_publication_dates_valid" CHECK (("novels"."publication_status" <> 'PUBLISHED' or "novels"."published_at" is not null) and ("novels"."publication_status" <> 'SCHEDULED' or "novels"."scheduled_for" is not null)),
	CONSTRAINT "novels_slug_format" CHECK ("novels"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_usage_count_nonnegative" CHECK ("tags"."usage_count" >= 0),
	CONSTRAINT "tags_slug_format" CHECK ("tags"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
--> statement-breakpoint
CREATE TABLE "novel_follows" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"followed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_follows_pk" PRIMARY KEY("user_id","novel_id")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_pk" PRIMARY KEY("user_id","novel_id"),
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"first_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "reading_history_pk" PRIMARY KEY("user_id","novel_id"),
	CONSTRAINT "reading_history_count_positive" CHECK ("reading_history"."read_count" > 0)
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"progress_percent" numeric(5, 2) DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_pk" PRIMARY KEY("user_id","novel_id"),
	CONSTRAINT "reading_progress_percent_range" CHECK ("reading_progress"."progress_percent" >= 0 and "reading_progress"."progress_percent" <= 100),
	CONSTRAINT "reading_progress_position_nonnegative" CHECK ("reading_progress"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "review_likes" (
	"review_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_likes_pk" PRIMARY KEY("review_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"title" varchar(200),
	"body" text NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"is_spoiler" boolean DEFAULT false NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"moderation_note" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reviews_body_not_blank" CHECK (length(btrim("reviews"."body")) > 0),
	CONSTRAINT "reviews_like_count_nonnegative" CHECK ("reviews"."like_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_library" (
	"user_id" uuid NOT NULL,
	"novel_id" uuid NOT NULL,
	"status" "library_status" DEFAULT 'PLAN_TO_READ' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_library_pk" PRIMARY KEY("user_id","novel_id"),
	CONSTRAINT "user_library_completed_date_valid" CHECK (("user_library"."status" <> 'COMPLETED') or ("user_library"."completed_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_daily_stats" ADD CONSTRAINT "novel_daily_stats_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_rankings" ADD CONSTRAINT "novel_rankings_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authenticators" ADD CONSTRAINT "authenticators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_alternative_titles" ADD CONSTRAINT "novel_alternative_titles_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_authors" ADD CONSTRAINT "novel_authors_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_authors" ADD CONSTRAINT "novel_authors_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_genres" ADD CONSTRAINT "novel_genres_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_genres" ADD CONSTRAINT "novel_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_search_documents" ADD CONSTRAINT "novel_search_documents_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_statistics" ADD CONSTRAINT "novel_statistics_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_statistics" ADD CONSTRAINT "novel_statistics_latest_chapter_fk" FOREIGN KEY ("novel_id","latest_chapter_id") REFERENCES "public"."chapters"("novel_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_tags" ADD CONSTRAINT "novel_tags_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_tags" ADD CONSTRAINT "novel_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novels" ADD CONSTRAINT "novels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novels" ADD CONSTRAINT "novels_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_follows" ADD CONSTRAINT "novel_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_follows" ADD CONSTRAINT "novel_follows_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_novel_chapter_fk" FOREIGN KEY ("novel_id","chapter_id") REFERENCES "public"."chapters"("novel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_novel_chapter_fk" FOREIGN KEY ("novel_id","chapter_id") REFERENCES "public"."chapters"("novel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_users_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_library" ADD CONSTRAINT "user_library_novel_id_novels_id_fk" FOREIGN KEY ("novel_id") REFERENCES "public"."novels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_date_idx" ON "admin_audit_logs" USING btree ("actor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_logs_entity_date_idx" ON "admin_audit_logs" USING btree ("entity_type","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_logs_action_date_idx" ON "admin_audit_logs" USING btree ("action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_object_key_uidx" ON "media_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_assets_status_created_idx" ON "media_assets" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_creator_idx" ON "media_assets" USING btree ("created_by","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_settings_public_idx" ON "site_settings" USING btree ("is_public","key");--> statement-breakpoint
CREATE INDEX "novel_daily_stats_date_views_idx" ON "novel_daily_stats" USING btree ("stat_date","views" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_rankings_period_novel_uidx" ON "novel_rankings" USING btree ("period","period_start","novel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_rankings_period_rank_uidx" ON "novel_rankings" USING btree ("period","period_start","rank");--> statement-breakpoint
CREATE INDEX "novel_rankings_public_idx" ON "novel_rankings" USING btree ("period","period_start" DESC NULLS LAST,"rank","novel_id");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "authenticators_user_id_idx" ON "authenticators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_id_uidx" ON "users" USING btree ("google_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uidx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_status_created_idx" ON "users" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens" USING btree ("expires");--> statement-breakpoint
CREATE UNIQUE INDEX "authors_slug_uidx" ON "authors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "authors_name_lower_idx" ON "authors" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_novel_number_uidx" ON "chapters" USING btree ("novel_id","chapter_number");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_novel_sort_order_uidx" ON "chapters" USING btree ("novel_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_novel_slug_uidx" ON "chapters" USING btree ("novel_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_novel_id_uidx" ON "chapters" USING btree ("novel_id","id");--> statement-breakpoint
CREATE INDEX "chapters_public_navigation_idx" ON "chapters" USING btree ("novel_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "chapters_published_navigation_idx" ON "chapters" USING btree ("novel_id","sort_order") WHERE "chapters"."status" = 'PUBLISHED' and "chapters"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "chapters_publication_queue_idx" ON "chapters" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "chapters_published_at_idx" ON "chapters" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "genres_slug_uidx" ON "genres" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "genres_name_lower_uidx" ON "genres" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "genres_active_order_idx" ON "genres" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_alt_titles_novel_title_uidx" ON "novel_alternative_titles" USING btree ("novel_id",lower("title"));--> statement-breakpoint
CREATE INDEX "novel_alt_titles_title_lower_idx" ON "novel_alternative_titles" USING btree (lower("title"));--> statement-breakpoint
CREATE INDEX "novel_authors_author_idx" ON "novel_authors" USING btree ("author_id","role","novel_id");--> statement-breakpoint
CREATE INDEX "novel_genres_genre_novel_idx" ON "novel_genres" USING btree ("genre_id","novel_id");--> statement-breakpoint
CREATE INDEX "novel_genres_novel_order_idx" ON "novel_genres" USING btree ("novel_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "novel_genres_one_primary_uidx" ON "novel_genres" USING btree ("novel_id") WHERE "novel_genres"."is_primary";--> statement-breakpoint
CREATE INDEX "novel_search_documents_trgm_idx" ON "novel_search_documents" USING gin ("search_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "novel_statistics_views_idx" ON "novel_statistics" USING btree ("view_count" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "novel_statistics_rating_idx" ON "novel_statistics" USING btree ("rating_average" DESC NULLS LAST,"rating_count" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "novel_tags_tag_novel_idx" ON "novel_tags" USING btree ("tag_id","novel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "novels_slug_uidx" ON "novels" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "novels_public_latest_idx" ON "novels" USING btree ("publication_status","latest_chapter_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "novels_latest_published_idx" ON "novels" USING btree ("latest_chapter_at" DESC NULLS LAST,"id") WHERE "novels"."publication_status" = 'PUBLISHED' and "novels"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "novels_public_status_idx" ON "novels" USING btree ("publication_status","status","id");--> statement-breakpoint
CREATE INDEX "novels_featured_public_idx" ON "novels" USING btree ("is_featured","publication_status","id");--> statement-breakpoint
CREATE INDEX "novels_title_lower_idx" ON "novels" USING btree (lower("title"));--> statement-breakpoint
CREATE INDEX "novels_search_idx" ON "novels" USING gin (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("title_original", '')));--> statement-breakpoint
CREATE UNIQUE INDEX "tags_slug_uidx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_name_lower_uidx" ON "tags" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "tags_active_usage_idx" ON "tags" USING btree ("is_active","usage_count" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "novel_follows_user_date_idx" ON "novel_follows" USING btree ("user_id","followed_at" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "novel_follows_novel_idx" ON "novel_follows" USING btree ("novel_id","user_id");--> statement-breakpoint
CREATE INDEX "ratings_novel_score_idx" ON "ratings" USING btree ("novel_id","score");--> statement-breakpoint
CREATE INDEX "reading_history_user_recent_idx" ON "reading_history" USING btree ("user_id","last_read_at" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "reading_history_chapter_idx" ON "reading_history" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "reading_progress_user_recent_idx" ON "reading_progress" USING btree ("user_id","last_read_at" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "reading_progress_chapter_idx" ON "reading_progress" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "review_likes_user_idx" ON "review_likes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_user_novel_uidx" ON "reviews" USING btree ("user_id","novel_id");--> statement-breakpoint
CREATE INDEX "reviews_novel_public_created_idx" ON "reviews" USING btree ("novel_id","created_at" DESC NULLS LAST,"id") WHERE "reviews"."status" = 'PUBLISHED' and "reviews"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "reviews_moderation_queue_idx" ON "reviews" USING btree ("status","created_at","id");--> statement-breakpoint
CREATE INDEX "user_library_user_status_updated_idx" ON "user_library" USING btree ("user_id","status","updated_at" DESC NULLS LAST,"novel_id");--> statement-breakpoint
CREATE INDEX "user_library_novel_status_idx" ON "user_library" USING btree ("novel_id","status");
