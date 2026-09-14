CREATE TABLE "reader_cosmetic_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"slot" varchar(24) NOT NULL,
	"rarity" varchar(16) NOT NULL,
	"class_id" varchar(32),
	"visual_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_cosmetic_items_slot_valid" CHECK ("reader_cosmetic_items"."slot" in ('profile_frame', 'card_effect', 'avatar_effect', 'reader_title', 'badge', 'background')),
	CONSTRAINT "reader_cosmetic_items_rarity_valid" CHECK ("reader_cosmetic_items"."rarity" in ('common', 'rare', 'epic', 'legendary')),
	CONSTRAINT "reader_cosmetic_items_class_valid" CHECK (class_id is null or class_id in ('martial','bl','yuri','romance','dark','reborn','isekai','system','mystery','horror','spicy','cozy')),
	CONSTRAINT "reader_cosmetic_items_visual_object" CHECK (jsonb_typeof("reader_cosmetic_items"."visual_config") = 'object')
);
--> statement-breakpoint
CREATE TABLE "reader_cosmetic_loadouts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"profile_frame_id" varchar(64),
	"card_effect_id" varchar(64),
	"avatar_effect_id" varchar(64),
	"reader_title_id" varchar(64),
	"badge_id" varchar(64),
	"background_id" varchar(64),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reader_cosmetic_unlocks" (
	"user_id" uuid NOT NULL,
	"cosmetic_item_id" varchar(64) NOT NULL,
	"source_type" varchar(32) NOT NULL,
	"source_reference" varchar(160) NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_cosmetic_unlocks_pk" PRIMARY KEY("user_id","cosmetic_item_id"),
	CONSTRAINT "reader_cosmetic_unlocks_source_valid" CHECK ("reader_cosmetic_unlocks"."source_type" in ('starter', 'mission_box', 'level_reward', 'event', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "reader_mission_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" varchar(64) NOT NULL,
	"period_key" varchar(16) NOT NULL,
	"progress_at_claim" integer NOT NULL,
	"reader_exp_awarded" integer NOT NULL,
	"cosmetic_item_id" varchar(64),
	"activity_event_id" uuid,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_mission_claims_progress_nonnegative" CHECK ("reader_mission_claims"."progress_at_claim" >= 0),
	CONSTRAINT "reader_mission_claims_exp_nonnegative" CHECK ("reader_mission_claims"."reader_exp_awarded" >= 0)
);
--> statement-breakpoint
CREATE TABLE "reader_mission_definitions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"cadence" varchar(16) NOT NULL,
	"metric" varchar(40) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text NOT NULL,
	"target" integer NOT NULL,
	"reader_exp_reward" integer NOT NULL,
	"grants_cosmetic_box" boolean DEFAULT false NOT NULL,
	"prerequisite_mission_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_mission_definitions_cadence_valid" CHECK ("reader_mission_definitions"."cadence" in ('daily', 'weekly')),
	CONSTRAINT "reader_mission_definitions_metric_valid" CHECK ("reader_mission_definitions"."metric" in ('qualified_chapters', 'main_class_chapters', 'distinct_novels', 'new_novels', 'complete_core')),
	CONSTRAINT "reader_mission_definitions_target_positive" CHECK ("reader_mission_definitions"."target" > 0),
	CONSTRAINT "reader_mission_definitions_exp_nonnegative" CHECK ("reader_mission_definitions"."reader_exp_reward" >= 0),
	CONSTRAINT "reader_mission_definitions_prerequisites_array" CHECK (jsonb_typeof("reader_mission_definitions"."prerequisite_mission_ids") = 'array')
);
--> statement-breakpoint
CREATE TABLE "reader_mission_progress" (
	"user_id" uuid NOT NULL,
	"mission_id" varchar(64) NOT NULL,
	"period_key" varchar(16) NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reader_mission_progress_pk" PRIMARY KEY("user_id","mission_id","period_key"),
	CONSTRAINT "reader_mission_progress_values_valid" CHECK ("reader_mission_progress"."progress" >= 0 and "reader_mission_progress"."target" > 0)
);
--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_profile_frame_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("profile_frame_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_card_effect_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("card_effect_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_avatar_effect_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("avatar_effect_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_reader_title_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("reader_title_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_badge_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_loadouts" ADD CONSTRAINT "reader_cosmetic_loadouts_background_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_unlocks" ADD CONSTRAINT "reader_cosmetic_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_cosmetic_unlocks" ADD CONSTRAINT "reader_cosmetic_unlocks_cosmetic_item_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("cosmetic_item_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_claims" ADD CONSTRAINT "reader_mission_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_claims" ADD CONSTRAINT "reader_mission_claims_mission_id_reader_mission_definitions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."reader_mission_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_claims" ADD CONSTRAINT "reader_mission_claims_cosmetic_item_id_reader_cosmetic_items_id_fk" FOREIGN KEY ("cosmetic_item_id") REFERENCES "public"."reader_cosmetic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_claims" ADD CONSTRAINT "reader_mission_claims_activity_event_id_reader_activity_events_id_fk" FOREIGN KEY ("activity_event_id") REFERENCES "public"."reader_activity_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_progress" ADD CONSTRAINT "reader_mission_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reader_mission_progress" ADD CONSTRAINT "reader_mission_progress_mission_id_reader_mission_definitions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."reader_mission_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reader_cosmetic_items_active_idx" ON "reader_cosmetic_items" USING btree ("is_active","rarity","sort_order");--> statement-breakpoint
CREATE INDEX "reader_cosmetic_unlocks_user_date_idx" ON "reader_cosmetic_unlocks" USING btree ("user_id","unlocked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "reader_mission_claims_user_period_uidx" ON "reader_mission_claims" USING btree ("user_id","mission_id","period_key");--> statement-breakpoint
CREATE INDEX "reader_mission_claims_user_date_idx" ON "reader_mission_claims" USING btree ("user_id","claimed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reader_mission_definitions_active_idx" ON "reader_mission_definitions" USING btree ("cadence","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "reader_mission_progress_user_period_idx" ON "reader_mission_progress" USING btree ("user_id","period_key","completed_at");
--> statement-breakpoint
INSERT INTO "reader_mission_definitions" (
	"id", "cadence", "metric", "title", "description", "target", "reader_exp_reward",
	"grants_cosmetic_box", "prerequisite_mission_ids", "sort_order"
) VALUES
	('daily-read-3', 'daily', 'qualified_chapters', 'อ่านให้เครื่องติด', 'อ่านตอนที่ผ่านเกณฑ์อย่างน้อย 3 ตอน', 3, 30, false, '[]'::jsonb, 10),
	('daily-main-5', 'daily', 'main_class_chapters', 'เดินบนเส้นทาง Class หลัก', 'อ่านตอนที่ตรงกับ Main Class 5 ตอน', 5, 50, false, '[]'::jsonb, 20),
	('daily-new-novel', 'daily', 'new_novels', 'เปิดโลกเรื่องใหม่', 'เริ่มอ่านนิยายที่ยังไม่เคยผ่านเกณฑ์มาก่อน 1 เรื่อง', 1, 20, false, '[]'::jsonb, 30),
	('daily-complete-all', 'daily', 'complete_core', 'Daily Clear', 'ทำภารกิจประจำวันหลักให้ครบทั้ง 3 ภารกิจ', 3, 50, false, '["daily-read-3","daily-main-5","daily-new-novel"]'::jsonb, 40),
	('weekly-read-30', 'weekly', 'qualified_chapters', 'นักอ่านประจำสัปดาห์', 'อ่านตอนที่ผ่านเกณฑ์รวม 30 ตอน', 30, 150, false, '[]'::jsonb, 110),
	('weekly-novels-3', 'weekly', 'distinct_novels', 'นักเดินทางหลายโลก', 'อ่านนิยายอย่างน้อย 3 เรื่องในสัปดาห์นี้', 3, 100, false, '[]'::jsonb, 120),
	('weekly-main-15', 'weekly', 'main_class_chapters', 'ฝึกฝน Class หลัก', 'อ่านตอนที่ตรงกับ Main Class รวม 15 ตอน', 15, 150, false, '[]'::jsonb, 130),
	('weekly-complete-all', 'weekly', 'complete_core', 'Weekly Clear', 'ทำภารกิจประจำสัปดาห์หลักให้ครบเพื่อเปิดกล่องของแต่ง', 3, 200, true, '["weekly-read-30","weekly-novels-3","weekly-main-15"]'::jsonb, 140);
--> statement-breakpoint
INSERT INTO "reader_cosmetic_items" (
	"id", "name", "description", "slot", "rarity", "visual_config", "sort_order"
) VALUES
	('frame-origin', 'กรอบนักอ่านแรกเริ่ม', 'กรอบประจำตัวสำหรับการเริ่มเส้นทาง Reader RPG', 'profile_frame', 'common', '{"pattern":"none","animation":"none"}'::jsonb, 10),
	('title-new-reader', 'ผู้เริ่มออกเดินทาง', 'ฉายาแรกของนักอ่าน NovelNow', 'reader_title', 'common', '{"title":"นักอ่านผู้เริ่มออกเดินทาง"}'::jsonb, 20),
	('background-midnight', 'คืนแรกในหอสมุด', 'พื้นหลังหอสมุดยามค่ำสำหรับโปรไฟล์ Class', 'background', 'common', '{"pattern":"grid","animation":"none"}'::jsonb, 30),
	('frame-sakura', 'กรอบบุปผาพเนจร', 'กลีบดอกไม้ล้อมรอบเส้นทางนักอ่าน', 'profile_frame', 'rare', '{"accent":"#ff79b0","accentSecondary":"#ffd0e1","pattern":"petals"}'::jsonb, 110),
	('frame-void', 'กรอบรอยแยกมิติ', 'แสงจากอีกมิติไหลผ่านขอบโปรไฟล์', 'profile_frame', 'epic', '{"accent":"#9b7cff","accentSecondary":"#71d7ff","pattern":"stars","animation":"shimmer"}'::jsonb, 120),
	('effect-starlight', 'ประกายดวงดาว', 'แสงวิ่งผ่านการ์ด Class อย่างนุ่มนวล', 'card_effect', 'epic', '{"accent":"#91caff","accentSecondary":"#fff2a6","pattern":"stars","animation":"shimmer"}'::jsonb, 130),
	('effect-embers', 'เถ้าถ่านไม่ดับสูญ', 'ประกายไฟลอยเหนือโปรไฟล์ของนักอ่าน', 'card_effect', 'rare', '{"accent":"#ff704d","accentSecondary":"#ffc15c","pattern":"embers","animation":"float"}'::jsonb, 140),
	('avatar-golden-aura', 'ออร่าผู้พิชิต', 'วงแสงสีทองเต้นรอบตัวละคร Class', 'avatar_effect', 'epic', '{"accent":"#f3b94f","accentSecondary":"#fff0a8","animation":"pulse"}'::jsonb, 150),
	('avatar-moon-aura', 'จังหวะแสงจันทร์', 'ออร่าสงบเย็นที่ทำให้ตัวละครลอยเบา ๆ', 'avatar_effect', 'rare', '{"accent":"#9fb7ff","accentSecondary":"#e7e4ff","animation":"float"}'::jsonb, 160),
	('title-night-voyager', 'นักเดินทางแห่งรัตติกาล', 'ฉายาสำหรับผู้ที่ยังเดินทางหลังตะวันลับฟ้า', 'reader_title', 'rare', '{"title":"นักเดินทางแห่งรัตติกาล"}'::jsonb, 170),
	('badge-seven-day', 'ตรา Seven Day', 'เครื่องหมายของนักอ่านที่ไม่ทิ้งเส้นทางกลางคัน', 'badge', 'rare', '{"accent":"#6ee7b7","accentSecondary":"#d1fae5","badgeText":"7D"}'::jsonb, 180),
	('background-celestial', 'แผนที่ดารา', 'พื้นหลังดวงดาวสำหรับนักอ่านผู้ท่องหลายโลก', 'background', 'epic', '{"accent":"#7567ff","accentSecondary":"#ffd977","pattern":"stars","animation":"shimmer"}'::jsonb, 190),
	('background-ember-night', 'ราตรีเพลิง', 'พื้นหลังประกายไฟของผู้ไม่หยุดอ่าน', 'background', 'rare', '{"accent":"#d94b36","accentSecondary":"#ffbd59","pattern":"embers","animation":"float"}'::jsonb, 200);
--> statement-breakpoint
INSERT INTO "reader_cosmetic_unlocks" (
	"user_id", "cosmetic_item_id", "source_type", "source_reference", "unlocked_at"
)
SELECT profile."user_id", starter."cosmetic_item_id", 'starter', 'reader-class-profile', profile."completed_at"
FROM "reader_class_profiles" AS profile
CROSS JOIN (
	VALUES ('frame-origin'), ('title-new-reader'), ('background-midnight')
) AS starter("cosmetic_item_id")
ON CONFLICT ("user_id", "cosmetic_item_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "reader_cosmetic_loadouts" (
	"user_id", "profile_frame_id", "reader_title_id", "background_id"
)
SELECT "user_id", 'frame-origin', 'title-new-reader', 'background-midnight'
FROM "reader_class_profiles"
ON CONFLICT ("user_id") DO NOTHING;
