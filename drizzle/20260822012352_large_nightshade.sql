ALTER TABLE "genres" DROP CONSTRAINT "genres_slug_format";--> statement-breakpoint
ALTER TABLE "genres" ADD CONSTRAINT "genres_slug_format" CHECK ("genres"."slug" ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$');