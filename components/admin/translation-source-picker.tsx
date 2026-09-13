"use client";

import Image from "next/image";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";

import { StatusPill } from "@/components/admin/status-pill";
import {
  getTranslationSourceState,
  type TranslationSourceStateKey,
  type TranslationWorkspaceSummary,
} from "@/components/admin/translation-source-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";

type Source = {
  id: string;
  title: string;
  provider: string;
  sourceLanguage: string;
  chapterCount: number;
  synopsis?: string | null;
  coverUrl: string;
  updatedAt: string;
};

type Workspace = TranslationWorkspaceSummary & {
  id: string;
  importSourceId: string;
  targetLanguage: string;
};

type FilterKey = "ALL" | TranslationSourceStateKey;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "ATTENTION", label: "ต้องจัดการ" },
  { key: "PROFILE", label: "Profile ยังไม่เสร็จ" },
  { key: "ACTIVE", label: "AI กำลังทำงาน" },
  { key: "READY", label: "พร้อมใช้งาน" },
  { key: "NOT_STARTED", label: "ยังไม่เริ่ม" },
  { key: "UNAVAILABLE", label: "ยังใช้ไม่ได้" },
];

const PAGE_SIZE = 40;

export function TranslationSourcePicker({
  sources,
  workspaces,
  targetLanguage,
  value,
  onChange,
}: {
  sources: Source[];
  workspaces: Workspace[];
  targetLanguage: string;
  value: string;
  onChange: (sourceId: string) => void;
}) {
  const listboxId = useId();
  const selected = sources.find((source) => source.id === value);
  const [query, setQuery] = useState(selected?.title ?? "");
  const deferredQuery = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const normalizedTarget = targetLanguage.trim().toLocaleLowerCase();

  const workspaceBySource = useMemo(() => {
    const result = new Map<string, Workspace>();
    for (const workspace of workspaces) {
      if (workspace.targetLanguage.toLocaleLowerCase() === normalizedTarget) result.set(workspace.importSourceId, workspace);
    }
    return result;
  }, [normalizedTarget, workspaces]);

  const rows = useMemo(() => sources.map((source) => {
    const workspace = workspaceBySource.get(source.id);
    return {
      source,
      state: getTranslationSourceState(source, workspace, normalizedTarget),
      updatedTime: new Date(source.updatedAt).getTime(),
    };
  }), [normalizedTarget, sources, workspaceBySource]);

  const counts = useMemo(() => {
    const result = new Map<FilterKey, number>([["ALL", rows.length]]);
    for (const row of rows) result.set(row.state.key, (result.get(row.state.key) ?? 0) + 1);
    return result;
  }, [rows]);

  const duplicateTitles = useMemo(() => {
    const titleCounts = new Map<string, number>();
    for (const source of sources) {
      const title = source.title.trim().toLocaleLowerCase();
      titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
    }
    return new Set([...titleCounts].filter(([, count]) => count > 1).map(([title]) => title));
  }, [sources]);

  const results = useMemo(() => {
    const term = deferredQuery.trim().toLocaleLowerCase();
    return rows
      .filter((row) => filter === "ALL" || row.state.key === filter)
      .filter(({ source, state }) => !term || `${source.title} ${source.provider} ${source.sourceLanguage} ${source.id} ${state.label} ${state.detail}`.toLocaleLowerCase().includes(term))
      .toSorted((left, right) => {
        if (left.source.id === value) return -1;
        if (right.source.id === value) return 1;
        if (term) {
          const leftStarts = left.source.title.toLocaleLowerCase().startsWith(term);
          const rightStarts = right.source.title.toLocaleLowerCase().startsWith(term);
          if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
        }
        if (left.state.priority !== right.state.priority) return left.state.priority - right.state.priority;
        return right.updatedTime - left.updatedTime;
      });
  }, [deferredQuery, filter, rows, value]);

  const visibleResults = results.slice(0, visibleLimit);
  const activeIndex = Math.min(active, Math.max(0, visibleResults.length - 1));

  function choose(source: Source) {
    onChange(source.id);
    setQuery(source.title);
    setOpen(false);
    setActive(0);
  }

  function clearSelection() {
    onChange("");
    setQuery("");
    setOpen(true);
    setActive(0);
    setVisibleLimit(PAGE_SIZE);
  }

  return (
    <div
      className="relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setQuery(selected?.title ?? "");
        }
      }}
    >
      <input type="hidden" name="importSourceId" value={value} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && visibleResults[activeIndex] ? `${listboxId}-${visibleResults[activeIndex].source.id}` : undefined}
          autoComplete="off"
          value={query}
          placeholder="ค้นหาชื่อเรื่อง ผู้ให้บริการ ภาษา หรือรหัสเรื่อง"
          className="px-10"
          onFocus={(event) => { setOpen(true); setActive(0); event.currentTarget.select(); }}
          onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); setActive(0); setVisibleLimit(PAGE_SIZE); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, Math.max(0, visibleResults.length - 1))); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
            else if (event.key === "Enter" && open && visibleResults[activeIndex]) { event.preventDefault(); choose(visibleResults[activeIndex].source); }
            else if (event.key === "Escape") { setOpen(false); setQuery(selected?.title ?? ""); }
          }}
        />
        {query || value ? (
          <button type="button" onClick={clearSelection} aria-label="ล้างเรื่องที่เลือกและคำค้น" className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-r-[6px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`สรุปสถานะงานภาษา ${normalizedTarget.toUpperCase()}`}>
        {FILTERS.filter((item) => item.key === "ALL" || (counts.get(item.key) ?? 0) > 0).map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={filter === item.key}
            onClick={() => { setFilter(item.key); setQuery(""); onChange(""); setOpen(true); setActive(0); setVisibleLimit(PAGE_SIZE); }}
            className={`min-h-9 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${filter === item.key ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-light-on-light)]" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {item.label} <span className="tabular-nums">{(counts.get(item.key) ?? 0).toLocaleString("th-TH")}</span>
          </button>
        ))}
      </div>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[14px] border border-border bg-popover shadow-[var(--sh-2)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/45 px-3 py-2 text-xs">
            <p role="status" aria-live="polite" className="font-semibold">พบ {results.length.toLocaleString("th-TH")} จาก {sources.length.toLocaleString("th-TH")} เรื่อง</p>
            <p className="text-muted-foreground">สถานะอิงงานภาษา {normalizedTarget.toUpperCase()}</p>
          </div>
          <div id={listboxId} role="listbox" aria-label="ผลการค้นหาเรื่อง" className="max-h-[min(62vh,520px)] overflow-y-auto p-1.5">
            {visibleResults.map(({ source, state }, index) => {
              const duplicate = duplicateTitles.has(source.title.trim().toLocaleLowerCase());
              return (
                <button
                  id={`${listboxId}-${source.id}`}
                  key={source.id}
                  type="button"
                  role="option"
                  aria-selected={source.id === value}
                  className={`flex w-full items-center gap-3 rounded-[10px] p-2.5 text-left transition-colors [contain-intrinsic-size:68px] [content-visibility:auto] hover:bg-muted ${index === activeIndex ? "bg-muted" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(source)}
                >
                  <span className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-[6px] bg-muted"><Image src={source.coverUrl} alt="" fill sizes="44px" className="object-cover" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{source.title}</span>{source.id === value ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="เลือกอยู่" /> : null}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{source.provider} · {source.sourceLanguage.toUpperCase()} · {source.chapterCount.toLocaleString("th-TH")} ตอน{duplicate ? ` · #${source.id.slice(0, 8)}` : ""}</span>
                    <span className="mt-1 block truncate text-[11px] text-muted-foreground"><span className="font-semibold text-foreground sm:hidden">{state.label} · </span>{state.detail}</span>
                  </span>
                  <StatusPill label={state.label} tone={state.tone} className="hidden shrink-0 sm:inline-flex" />
                </button>
              );
            })}
            {!results.length ? (
              <div className="grid justify-items-center px-4 py-8 text-center">
                <Search className="h-6 w-6 text-muted-foreground" aria-hidden />
                <p className="mt-2 text-sm font-semibold">ไม่พบเรื่องในตัวกรองนี้</p>
                <p className="mt-1 text-xs text-muted-foreground">ลองเปลี่ยนคำค้นหรือดูทุกสถานะ</p>
                <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => { setQuery(""); setFilter("ALL"); onChange(""); setActive(0); setVisibleLimit(PAGE_SIZE); }}>ล้างคำค้นและตัวกรอง</Button>
              </div>
            ) : null}
            {visibleLimit < results.length ? (
              <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => setVisibleLimit((limit) => limit + PAGE_SIZE)}>
                แสดงเพิ่มอีก {Math.min(PAGE_SIZE, results.length - visibleLimit).toLocaleString("th-TH")} เรื่อง
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
