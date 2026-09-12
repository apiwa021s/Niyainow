CREATE TABLE "world_characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(24) NOT NULL,
	"body_preset" varchar(32) NOT NULL,
	"skin_tone" varchar(32) NOT NULL,
	"face_id" varchar(32) NOT NULL,
	"eye_id" varchar(32) NOT NULL,
	"hair_id" varchar(32) NOT NULL,
	"hair_color" varchar(32) NOT NULL,
	"top_id" varchar(32) NOT NULL,
	"bottom_id" varchar(32) NOT NULL,
	"shoes_id" varchar(32) NOT NULL,
	"accessory_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"title" varchar(48),
	"current_world" varchar(64) DEFAULT 'novelnow-central' NOT NULL,
	"x" real DEFAULT 1200 NOT NULL,
	"y" real DEFAULT 1260 NOT NULL,
	"intro_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_characters_position_finite" CHECK ("world_characters"."x" between 0 and 100000 and "world_characters"."y" between 0 and 100000),
	CONSTRAINT "world_characters_accessories_array" CHECK (jsonb_typeof("world_characters"."accessory_ids") = 'array'),
	CONSTRAINT "world_characters_display_name_not_blank" CHECK (length(btrim("world_characters"."display_name")) >= 2)
);
--> statement-breakpoint
ALTER TABLE "world_characters" ADD CONSTRAINT "world_characters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "world_characters_user_uidx" ON "world_characters" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "world_characters_display_name_lower_uidx" ON "world_characters" USING btree (lower("display_name"));--> statement-breakpoint
CREATE INDEX "world_characters_world_seen_idx" ON "world_characters" USING btree ("current_world","last_seen_at" DESC NULLS LAST,"id");