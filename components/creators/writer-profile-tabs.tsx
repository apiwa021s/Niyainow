"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const TABS = [
  { key: "works", label: "ผลงาน" },
  { key: "posts", label: "โพสต์" },
  { key: "about", label: "เกี่ยวกับ" },
] as const;

export type WriterProfileTab = (typeof TABS)[number]["key"];

/** Tab switcher for the writer public profile (brief §65) — panels are supplied by the caller so this stays presentation-only. */
export function WriterProfileTabs({
  works,
  posts,
  about,
}: {
  works: React.ReactNode;
  posts: React.ReactNode;
  about: React.ReactNode;
}) {
  const [active, setActive] = useState<WriterProfileTab>("works");
  const panels: Record<WriterProfileTab, React.ReactNode> = { works, posts, about };

  return (
    <div>
      <div role="tablist" aria-label="ส่วนของโปรไฟล์นักเขียน" className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold transition-colors",
              active === tab.key
                ? "border-[var(--brand-emphasis)] text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="py-5">{panels[active]}</div>
    </div>
  );
}
