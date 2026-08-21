"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { CreatorTransaction, CreatorTransactionType } from "@/components/studio/mock-earnings";
import { StudioPanel } from "@/components/studio/studio-ui";
import { CREATOR_TRANSACTION_TYPES } from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

import { CreatorTransactionRow } from "./creator-transaction-row";

const STATUS_FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "pending", label: "กำลังตรวจสอบ" },
  { id: "available", label: "พร้อมรับเงิน" },
  { id: "reversed", label: "ปรับปรุงรายการ" },
] as const;

/** Full ledger with filters + search (spec §22–24). */
export function CreatorTransactionList({ transactions }: { transactions: readonly CreatorTransaction[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<CreatorTransactionType | "all">("all");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (type !== "all" && tx.type !== type) return false;
      if (status !== "all" && tx.status !== status) return false;
      if (q) {
        const haystack = `${tx.storyTitle ?? ""} ${tx.chapterLabel ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, query, type, status]);

  return (
    <StudioPanel title="รายการรายได้" description={`${filtered.length} รายการ`}>
      <div className="grid gap-3 border-b border-border p-5">
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="ค้นหาเรื่องหรือตอน..."
            className="h-11 w-full rounded-(--r-md) border border-border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-emphasis)]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองประเภท">
          <button
            type="button"
            role="tab"
            aria-selected={type === "all"}
            onClick={() => setType("all")}
            className={cn(
              "tap-target inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
              type === "all"
                ? "bg-[var(--brand-primary)] text-white"
                : "border border-border text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
            )}
          >
            ทุกประเภท
          </button>
          {CREATOR_TRANSACTION_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={type === item.id}
              onClick={() => setType(item.id as CreatorTransactionType)}
              className={cn(
                "tap-target inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                type === item.id
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-border text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
              )}
            >
              {item.nameTh}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองสถานะ">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={status === item.id}
              onClick={() => setStatus(item.id)}
              className={cn(
                "tap-target inline-flex h-9 items-center rounded-(--r-md) px-2.5 text-xs font-medium transition-colors",
                status === item.id ? "bg-muted text-(--text-primary)" : "text-(--text-tertiary) hover:text-(--text-secondary)",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-(--text-tertiary)">ไม่พบรายการที่ตรงกับตัวกรอง</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((tx) => (
            <li key={tx.id}>
              <CreatorTransactionRow tx={tx} />
            </li>
          ))}
        </ul>
      )}
    </StudioPanel>
  );
}
