"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { studioSearchIndex } from "@/components/studio/mock-data";

const GROUPS = [
  { key: "works", label: "ผลงาน", href: "/studio/works" },
  { key: "chapters", label: "ตอน", href: "/studio/works" },
  { key: "glossary", label: "คลังคำ", href: "/studio/glossary" },
] as const;

const PER_GROUP = 4;

/**
 * Studio search is scoped to the writer's own shelf. The public field searches
 * every title on the site, which is the wrong question to answer from inside a
 * dashboard — here "ตอนที่ 43" means their chapter 43, not someone else's.
 */
export function StudioSearch() {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const term = query.trim().toLowerCase();
  const results = GROUPS.map((group) => ({
    ...group,
    items: studioSearchIndex[group.key].filter((item) => item.label.toLowerCase().includes(term)),
  })).filter((group) => group.items.length > 0);

  const showPanel = open && term.length > 0;
  const empty = showPanel && results.length === 0;

  return (
    <div
      className="relative min-w-0 flex-1 sm:max-w-md"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-label="ค้นในผลงานของฉัน"
        placeholder="ค้นในผลงานของฉัน — ชื่อเรื่อง ชื่อตอน หรือคำในคลังคำ"
        className="h-11 w-full rounded-(--r-md) border border-border bg-card pl-9 pr-3 text-sm transition-colors duration-[var(--dur-fast)] placeholder:text-(--text-tertiary) hover:border-[var(--brand-emphasis)]"
      />

      {showPanel ? (
        <div
          id={listboxId}
          className="absolute left-0 right-0 top-13 z-50 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-[var(--sh-2)]"
        >
          {empty ? (
            <p className="px-3 py-4 text-sm leading-6 text-(--text-secondary)">
              ไม่เจอ “{query.trim()}” ในผลงานของคุณ ลองคำที่สั้นลง หรือ{" "}
              <Link href="/studio/glossary" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                เพิ่มคำนี้เข้าคลังคำ
              </Link>
            </p>
          ) : (
            results.map((group) => (
              <div key={group.key} role="group" aria-label={group.label} className="pb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-(--text-tertiary)">
                  {group.label}
                </p>
                <ul>
                  {group.items.slice(0, PER_GROUP).map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-(--r-md) px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        <span className="shrink-0 text-xs text-(--text-tertiary)">{item.meta}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {group.items.length > PER_GROUP ? (
                  <Link
                    href={group.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center px-3 text-xs font-semibold text-[var(--brand-emphasis)] hover:underline"
                  >
                    ดูทั้งหมดใน{group.label} ({group.items.length})
                  </Link>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
