"use client";

import { BookOpen, Clock3 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useLocalMockStore } from "@/hooks/use-local-mock-store";
import { DEFAULT_PRIVACY_PREFS, readPrivacyPrefs } from "@/lib/domain/reader-privacy";
import type { NovelUpdate } from "@/services/novel-service";

/**
 * Reader notification feed (brief §80–82) built from real followed-novel
 * updates (services/novel-service.ts getUpdatesForNovels) — no separate
 * notification dispatch exists, so "notifications" here are the same update
 * feed shown on Home, reframed as a center. Respects the discreet-notification
 * privacy toggle (§85–86) by hiding titles when it's on.
 */
export function NotificationList({ updates }: { updates: NovelUpdate[] }) {
  const discreet = useLocalMockStore(
    () => readPrivacyPrefs().discreetNotifications,
    () => DEFAULT_PRIVACY_PREFS.discreetNotifications,
  );

  return (
    <div>
      {updates.length > 3 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          มี {updates.length.toLocaleString("th-TH")} เรื่องที่คุณติดตามอัปเดตล่าสุด
        </p>
      ) : null}
      <ol className="grid gap-2">
        {updates.map((item, index) => (
          <li key={`${item.novelSlug}-${item.chapter}-${index}`}>
            <div className="flex items-center gap-3 rounded-(--r-md) border border-border bg-card p-3">
              {discreet ? (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[5px] bg-muted text-muted-foreground">
                  <BookOpen className="h-5 w-5" aria-hidden />
                </div>
              ) : (
                <div className="relative aspect-2/3 w-11 shrink-0 overflow-hidden rounded-[5px] bg-muted">
                  <Image src={item.novel.cover} alt="" fill sizes="44px" className="object-cover" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {discreet ? "เรื่องที่คุณติดตามมีตอนใหม่" : item.novel.thaiTitle}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {discreet
                    ? `ตอน ${item.chapter.toLocaleString("th-TH")} มาแล้ว`
                    : `EP.${item.chapter.toLocaleString("th-TH")} มาแล้ว · ${item.novel.author} อัปเดต`}
                </p>
                <p className="tabular mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3 w-3" aria-hidden />
                  {item.time}
                </p>
              </div>
              <Link
                href={`/novel/${item.novelSlug}/chapter/${item.chapter}`}
                className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-[var(--brand-primary)]/10 px-3 text-xs font-semibold text-[var(--brand-emphasis)] hover:bg-[var(--brand-primary)]/18"
              >
                อ่านเลย
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
