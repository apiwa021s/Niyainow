ALTER TABLE "media_assets" ADD COLUMN "staging_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "media_assets_staging_key_uidx" ON "media_assets" USING btree ("staging_key");--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_staging_key_valid" CHECK ("media_assets"."staging_key" is null or "media_assets"."staging_key" ~ '^staging/(covers|banners|avatars|novels/assets|og)/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](jpg|png|webp|avif)$');
