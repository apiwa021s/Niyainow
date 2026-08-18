CREATE TYPE "public"."coin_ledger_type" AS ENUM('TOP_UP', 'ADMIN_CREDIT', 'PROMOTION', 'CHAPTER_UNLOCK', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "chapter_unlocks" (
	"user_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"price_paid" integer NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_unlocks_pk" PRIMARY KEY("user_id","chapter_id"),
	CONSTRAINT "chapter_unlocks_price_positive" CHECK ("chapter_unlocks"."price_paid" > 0)
);
--> statement-breakpoint
CREATE TABLE "coin_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "coin_ledger_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"chapter_id" uuid,
	"idempotency_key" varchar(255) NOT NULL,
	"external_reference" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coin_ledger_entries_amount_nonzero" CHECK ("coin_ledger_entries"."amount" <> 0),
	CONSTRAINT "coin_ledger_entries_balance_nonnegative" CHECK ("coin_ledger_entries"."balance_after" >= 0),
	CONSTRAINT "coin_ledger_entries_direction_valid" CHECK (("coin_ledger_entries"."type" = 'CHAPTER_UNLOCK' and "coin_ledger_entries"."amount" < 0)
        or ("coin_ledger_entries"."type" in ('TOP_UP', 'ADMIN_CREDIT', 'PROMOTION', 'REFUND') and "coin_ledger_entries"."amount" > 0)
        or ("coin_ledger_entries"."type" = 'ADJUSTMENT' and "coin_ledger_entries"."amount" <> 0))
);
--> statement-breakpoint
CREATE TABLE "coin_wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"lifetime_credited" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coin_wallets_amounts_nonnegative" CHECK ("coin_wallets"."balance" >= 0 and "coin_wallets"."lifetime_credited" >= 0 and "coin_wallets"."lifetime_spent" >= 0)
);
--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_ledger_entry_id_coin_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."coin_ledger_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_ledger_entries" ADD CONSTRAINT "coin_ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_ledger_entries" ADD CONSTRAINT "coin_ledger_entries_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_wallets" ADD CONSTRAINT "coin_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_unlocks_ledger_entry_uidx" ON "chapter_unlocks" USING btree ("ledger_entry_id");--> statement-breakpoint
CREATE INDEX "chapter_unlocks_chapter_idx" ON "chapter_unlocks" USING btree ("chapter_id","user_id");--> statement-breakpoint
CREATE INDEX "chapter_unlocks_user_recent_idx" ON "chapter_unlocks" USING btree ("user_id","unlocked_at" DESC NULLS LAST,"chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_ledger_entries_idempotency_uidx" ON "coin_ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_ledger_entries_external_reference_uidx" ON "coin_ledger_entries" USING btree ("external_reference") WHERE "coin_ledger_entries"."external_reference" is not null;--> statement-breakpoint
CREATE INDEX "coin_ledger_entries_user_created_idx" ON "coin_ledger_entries" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "coin_ledger_entries_chapter_idx" ON "coin_ledger_entries" USING btree ("chapter_id","user_id");