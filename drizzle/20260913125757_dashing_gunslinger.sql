CREATE TABLE "novel_import_manga_pages" (
	"chapter_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"checksum_sha256" varchar(44) NOT NULL,
	"content_type" varchar(100) NOT NULL,
	"byte_size" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "novel_import_manga_pages_pk" PRIMARY KEY("chapter_id","page_number"),
	CONSTRAINT "novel_import_manga_pages_number_positive" CHECK ("novel_import_manga_pages"."page_number" > 0),
	CONSTRAINT "novel_import_manga_pages_source_url_https" CHECK ("novel_import_manga_pages"."source_url" ~ '^https://'),
	CONSTRAINT "novel_import_manga_pages_checksum_format" CHECK ("novel_import_manga_pages"."checksum_sha256" ~ '^[A-Za-z0-9+/]{43}=$'),
	CONSTRAINT "novel_import_manga_pages_content_type_allowed" CHECK ("novel_import_manga_pages"."content_type" in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
	CONSTRAINT "novel_import_manga_pages_byte_size_positive" CHECK ("novel_import_manga_pages"."byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "novel_import_chapters" ADD COLUMN "original_title" text;--> statement-breakpoint
ALTER TABLE "novel_import_sources" ADD COLUMN "content_format" varchar(16) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "novel_import_manga_pages" ADD CONSTRAINT "novel_import_manga_pages_chapter_id_novel_import_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."novel_import_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "novel_import_manga_pages" ADD CONSTRAINT "novel_import_manga_pages_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "novel_import_manga_pages_media_uidx" ON "novel_import_manga_pages" USING btree ("media_asset_id");--> statement-breakpoint
CREATE INDEX "novel_import_manga_pages_chapter_idx" ON "novel_import_manga_pages" USING btree ("chapter_id","page_number");--> statement-breakpoint
ALTER TABLE "novel_import_chapters" ADD CONSTRAINT "novel_import_chapters_title_not_blank" CHECK ("novel_import_chapters"."original_title" is null or length(btrim("novel_import_chapters"."original_title")) > 0);--> statement-breakpoint
ALTER TABLE "novel_import_sources" ADD CONSTRAINT "novel_import_sources_content_format_valid" CHECK ("novel_import_sources"."content_format" in ('text', 'manga'));