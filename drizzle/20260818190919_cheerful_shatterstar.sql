ALTER TABLE "chapter_unlocks" DROP CONSTRAINT "chapter_unlocks_ledger_entry_id_coin_ledger_entries_id_fk";
--> statement-breakpoint
CREATE UNIQUE INDEX "coin_ledger_entries_user_id_uidx" ON "coin_ledger_entries" USING btree ("user_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_ledger_entries_chapter_id_uidx" ON "coin_ledger_entries" USING btree ("chapter_id","id");--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_user_ledger_fk" FOREIGN KEY ("user_id","ledger_entry_id") REFERENCES "public"."coin_ledger_entries"("user_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_unlocks" ADD CONSTRAINT "chapter_unlocks_chapter_ledger_fk" FOREIGN KEY ("chapter_id","ledger_entry_id") REFERENCES "public"."coin_ledger_entries"("chapter_id","id") ON DELETE restrict ON UPDATE no action;
