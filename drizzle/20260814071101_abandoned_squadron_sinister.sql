CREATE TABLE "promo_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"image_key" text NOT NULL,
	"link_url" text,
	"cta_label" varchar(80),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_banners_image_key_is_object_key" CHECK ("promo_banners"."image_key" !~ '://' and left("promo_banners"."image_key", 1) <> '/'),
	CONSTRAINT "promo_banners_link_url_safe" CHECK ("promo_banners"."link_url" is null or "promo_banners"."link_url" ~ '^(/[^/]|https?://)'),
	CONSTRAINT "promo_banners_window_valid" CHECK ("promo_banners"."starts_at" is null or "promo_banners"."ends_at" is null or "promo_banners"."starts_at" < "promo_banners"."ends_at")
);
--> statement-breakpoint
ALTER TABLE "promo_banners" ADD CONSTRAINT "promo_banners_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promo_banners_active_order_idx" ON "promo_banners" USING btree ("is_active","sort_order","id");