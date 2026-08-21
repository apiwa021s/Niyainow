"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { WalletSnapshot } from "@/services/coin-service";

const transactionLabels = {
  TOP_UP: "เติมเหรียญ",
  ADMIN_CREDIT: "เพิ่มเหรียญโดยทีมงาน",
  PROMOTION: "เหรียญโปรโมชั่น",
  CHAPTER_UNLOCK: "ปลดล็อกตอน",
  REFUND: "คืนเหรียญ",
  ADJUSTMENT: "ปรับยอดเหรียญ",
} as const;

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

type Entry = WalletSnapshot["entries"][number];

const TABS = [
  { key: "all", label: "ทั้งหมด", match: () => true },
  { key: "topup", label: "เติม Coins", match: (entry: Entry) => entry.type === "TOP_UP" },
  { key: "spend", label: "ใช้ Coins", match: (entry: Entry) => entry.type === "CHAPTER_UNLOCK" },
  {
    key: "bonus",
    label: "โบนัส",
    match: (entry: Entry) => entry.type === "ADMIN_CREDIT" || entry.type === "PROMOTION" || entry.type === "REFUND" || entry.type === "ADJUSTMENT",
  },
] as const;

/** Coin history with type tabs (brief §61) — pure client-side filter over the already-fetched ledger. */
export function WalletHistoryTabs({ entries }: { entries: Entry[] }) {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("all");
  const activeTab = TABS.find((tab) => tab.key === active) ?? TABS[0];
  const visible = entries.filter(activeTab.match);

  return (
    <div>
      <div role="tablist" aria-label="ประเภทรายการเหรียญ" className="rail-scroll -mx-1 flex gap-1 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
              active === tab.key
                ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/12 text-[var(--brand-emphasis)]"
                : "border-border bg-card text-(--text-secondary) hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length > 0 ? (
        <ol className="mt-4 divide-y divide-border/60">
          {visible.map((entry) => {
            const chapterHref = entry.novelSlug && entry.chapterNumber !== null
              ? `/novel/${entry.novelSlug}/chapter/${entry.chapterNumber}`
              : null;
            const detail = entry.chapterNumber !== null
              ? `${entry.novelTitle ?? "นิยาย"} · ตอน ${entry.chapterNumber.toLocaleString("th-TH")}`
              : null;
            return (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{transactionLabels[entry.type]}</p>
                  {detail && chapterHref ? (
                    <Link href={chapterHref} className="mt-1 block truncate text-xs text-(--text-secondary) hover:text-(--brand-emphasis)">{detail}</Link>
                  ) : detail ? <p className="mt-1 truncate text-xs text-(--text-secondary)">{detail}</p> : null}
                  <time dateTime={entry.createdAt} className="mt-1 block text-xs text-(--text-tertiary)">
                    {dateFormatter.format(new Date(entry.createdAt))}
                  </time>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`inline-flex items-center gap-1.5 font-semibold tabular-nums ${entry.amount > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-foreground"}`}>
                    {entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString("th-TH")}
                  </p>
                  <p className="mt-1 text-xs text-(--text-tertiary)">คงเหลือ {entry.balanceAfter.toLocaleString("th-TH")}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-(--text-secondary)">ไม่มีรายการในหมวดนี้</p>
      )}
    </div>
  );
}
