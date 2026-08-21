"use client";

import { ArrowUpDown, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ChapterRow } from "@/components/studio/dashboard/chapter-row";
import type { StudioChapter } from "@/components/studio/mock-data";
import { EmptyState, StudioPanel } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";

const TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "published", label: "เผยแพร่แล้ว" },
  { id: "draft", label: "ฉบับร่าง" },
  { id: "scheduled", label: "ตั้งเวลา" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function matchesTab(chapter: StudioChapter, tab: TabId) {
  if (tab === "all") return true;
  if (tab === "published") return chapter.status === "published" || chapter.status === "unpublished";
  return chapter.status === tab;
}

export function ChapterManagement({
  storySlug,
  chapters,
}: {
  storySlug: string;
  chapters: readonly StudioChapter[];
}) {
  const [order, setOrder] = useState(chapters);
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [reorderMode, setReorderMode] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ index: number; direction: -1 | 1 } | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return order
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ chapter }) => matchesTab(chapter, tab) && (!term || chapter.title.toLowerCase().includes(term)));
  }, [order, tab, query]);

  function applyMove(index: number, direction: -1 | 1) {
    setOrder((current) => {
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function requestMove(index: number, direction: -1 | 1) {
    const chapter = order[index];
    // Published order is what readers already navigated by — never move it
    // without a confirmation (spec §7).
    if (chapter.status === "published") {
      setPendingMove({ index, direction });
      return;
    }
    applyMove(index, direction);
  }

  const pendingChapter = pendingMove ? order[pendingMove.index] : null;

  return (
    <StudioPanel
      title="ตอนทั้งหมด"
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReorderMode((value) => !value)}
            aria-pressed={reorderMode}
            className={
              reorderMode
                ? "tap-target inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-subtle px-3 text-xs font-semibold text-[var(--brand-emphasis)]"
                : "tap-target inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-(--text-secondary) hover:border-[var(--brand-emphasis)]"
            }
          >
            <ArrowUpDown aria-hidden className="h-3.5 w-3.5" />
            จัดลำดับตอน
          </button>
          <ButtonLink href={`/studio/works/${storySlug}/chapters/new`} variant="outline" size="sm">
            <Plus aria-hidden className="h-4 w-4" />
            เขียนตอนใหม่
          </ButtonLink>
        </div>
      }
    >
      <div className="grid gap-3 border-b border-border p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองตอนตามสถานะ">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={
                tab === item.id
                  ? "tap-target inline-flex h-9 items-center rounded-full bg-[var(--brand-primary)] px-3.5 text-xs font-semibold text-white"
                  : "tap-target inline-flex h-9 items-center rounded-full border border-border px-3.5 text-xs font-semibold text-(--text-secondary) hover:border-[var(--brand-emphasis)]"
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-tertiary)" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อตอน…"
            aria-label="ค้นหาชื่อตอน"
            className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm transition-colors duration-[var(--dur-fast)] placeholder:text-(--text-tertiary) hover:border-[var(--brand-emphasis)]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="ไม่พบตอนที่ตรงกับตัวกรอง"
          description="ลองล้างคำค้นหาหรือเปลี่ยนไปดูตอนในสถานะอื่น"
        />
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map(({ chapter, index }) => (
            <ChapterRow
              key={chapter.number}
              chapter={chapter}
              storySlug={storySlug}
              reorder={
                reorderMode
                  ? {
                      canMoveUp: index > 0,
                      canMoveDown: index < order.length - 1,
                      onMoveUp: () => requestMove(index, -1),
                      onMoveDown: () => requestMove(index, 1),
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingMove !== null}
        onClose={() => setPendingMove(null)}
        onConfirm={() => {
          if (pendingMove) applyMove(pendingMove.index, pendingMove.direction);
        }}
        title="ย้ายลำดับตอนที่เผยแพร่แล้ว?"
        description={
          pendingChapter
            ? `EP.${String(pendingChapter.number).padStart(2, "0")} · ${pendingChapter.title} จะเปลี่ยนตำแหน่งในสารบัญที่ผู้อ่านเห็นอยู่ตอนนี้ ผู้อ่านที่อ่านค้างไว้อาจสับสนกับลำดับตอนที่เปลี่ยนไป`
            : ""
        }
        confirmLabel="ย้ายลำดับ"
      />
    </StudioPanel>
  );
}
