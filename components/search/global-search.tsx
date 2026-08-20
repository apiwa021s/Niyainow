"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/form-controls";
import {
  flattenGroupedSearchSuggestions,
  groupSearchSuggestions,
  type SearchSuggestion,
  type SearchSuggestionGroupKind,
} from "@/lib/search/group-suggestions";
import { cn } from "@/lib/utils";

const RECENT_SEARCHES_KEY = "niyainow-recent-searches";
const RECENT_SEARCHES_EVENT = "niyainow-recent-searches-change";

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_SEARCHES_EVENT, onChange);
  const timer = window.setTimeout(onChange, 0);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_SEARCHES_EVENT, onChange);
  };
}

function getRecentSnapshot() {
  try {
    return window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]";
  } catch {
    return "[]";
  }
}

function recentFromSnapshot(snapshot: string) {
  try {
    const stored = JSON.parse(snapshot) as unknown;
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

const groupLabels: Record<SearchSuggestionGroupKind, string> = {
  novels: "นิยาย",
  authors: "ผู้แต่ง",
  translators: "ผู้แปล",
  genres: "หมวดหมู่",
  tags: "แท็ก",
};

function saveRecent(query: string) {
  const cleaned = query.trim().slice(0, 100);
  if (cleaned.length < 2) return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as unknown;
    const current = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([cleaned, ...current.filter((item) => item !== cleaned)].slice(0, 6)));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
  } catch {
    // Navigation still works when local storage is unavailable.
  }
}

export function GlobalSearch({ mode, onNavigate }: { mode: "inline" | "mobile"; onNavigate?: () => void }) {
  const router = useRouter();
  const listboxId = useId();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [options, setOptions] = useState<SearchSuggestion[]>([]);
  const requestVersionRef = useRef(0);
  const recentSnapshot = useSyncExternalStore(subscribeRecent, getRecentSnapshot, () => "[]");
  const recent = recentFromSnapshot(recentSnapshot);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const groups = groupSearchSuggestions(options);
  const visibleOptions = flattenGroupedSearchSuggestions(groups);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const requestVersion = requestVersionRef.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("suggestion request failed");
        const payload = (await response.json()) as { suggestions?: SearchSuggestion[] };
        if (requestVersion === requestVersionRef.current) {
          setOptions(Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 9) : []);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  function go(href: string, recentQuery?: string) {
    if (recentQuery) saveRecent(recentQuery);
    requestVersionRef.current += 1;
    onNavigate?.();
    setQ("");
    setOptions([]);
    setLoading(false);
    setOpen(false);
    router.push(href);
  }

  function submit() {
    const query = q.trim();
    if (query.length >= 2) go(`/search?q=${encodeURIComponent(query)}`, query);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const keyboardOptions: SearchSuggestion[] = q.trim().length < 2
      ? recent.map((item) => ({ label: item, meta: "", href: `/search?q=${encodeURIComponent(item)}` }))
      : visibleOptions;
    if (event.key === "ArrowDown" && keyboardOptions.length) { event.preventDefault(); setActive((value) => Math.min(value + 1, keyboardOptions.length - 1)); }
    if (event.key === "ArrowUp" && keyboardOptions.length) { event.preventDefault(); setActive((value) => Math.max(value - 1, 0)); }
    if (event.key === "Home" && keyboardOptions.length) { event.preventDefault(); setActive(0); }
    if (event.key === "End" && keyboardOptions.length) { event.preventDefault(); setActive(keyboardOptions.length - 1); }
    if (event.key === "Enter") {
      event.preventDefault();
      const selected = keyboardOptions[active];
      if (selected) go(selected.href, q.trim().length >= 2 ? q : selected.label);
      else submit();
    }
    if (event.key === "Escape") { requestVersionRef.current += 1; setOpen(false); setOptions([]); setLoading(false); }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      const container = event.currentTarget;
      window.setTimeout(() => {
        if (!container.contains(document.activeElement)) setOpen(false);
      }, 0);
    }
  }

  const showSuggestions = open && q.trim().length >= 2;
  const showRecent = open && q.trim().length < 2;

  return (
    <div className={cn("relative", mode === "inline" ? "w-full max-w-2xl" : "w-full")} onBlurCapture={onBlur}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value.slice(0, 100);
          requestVersionRef.current += 1;
          setQ(next);
          setOpen(true);
          setActive(0);
          setOptions([]);
          setLoading(next.trim().length >= 2);
        }}
        onKeyDown={onKeyDown}
        placeholder="ค้นหาชื่อเรื่อง ผู้แต่ง หรือผู้แปล"
        className="pl-9 pr-12"
        role="combobox"
        aria-label="ค้นหานิยาย"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showSuggestions || (showRecent && recent.length > 0)}
        aria-activedescendant={showSuggestions && visibleOptions[active]
          ? `${listboxId}-option-${active}`
          : showRecent && recent[active]
            ? `${listboxId}-recent-${active}`
            : undefined}
        maxLength={100}
      />
      {q ? (
        <button type="button" onClick={() => { requestVersionRef.current += 1; setQ(""); setOptions([]); setLoading(false); setOpen(true); setActive(0); }} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="ล้างคำค้น"><X className="h-4 w-4" /></button>
      ) : null}

      {showSuggestions ? (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[min(70vh,420px)] overflow-y-auto rounded-[8px] border border-border bg-popover p-1 shadow-[var(--sh-2)]">
          <div role="status" aria-live="polite" className="border-b border-border px-3 py-2 text-xs text-muted-foreground">{loading ? "กำลังค้นหา…" : `คำแนะนำสำหรับ “${q.trim()}”`}</div>
          <div id={listboxId} role="listbox" aria-label="คำแนะนำการค้นหา">{groups.map((group) => (
            <div key={group.kind} role="group" aria-labelledby={`${listboxId}-${group.kind}`}>
              <p id={`${listboxId}-${group.kind}`} className="px-3 pb-1 pt-3 text-[11px] font-semibold tracking-[.12em] text-muted-foreground">{groupLabels[group.kind]}</p>
              {group.items.map(({ option, index }) => (
                <Link
                  id={`${listboxId}-option-${index}`}
                  key={option.href + option.label}
                  href={option.href}
                  onClick={() => { saveRecent(q); onNavigate?.(); setQ(""); setOpen(false); }}
                  role="option"
                  aria-selected={active === index}
                  onMouseEnter={() => setActive(index)}
                  className={cn("flex min-h-11 items-center rounded-[6px] px-3 py-2 text-sm hover:bg-muted", active === index && "bg-muted")}
                >
                  <span className="font-medium">{option.label}</span>
                  {(group.kind === "novels" || group.kind === "authors" || group.kind === "translators") && option.meta && option.meta !== option.label ? <span className="ml-2 text-xs text-muted-foreground">{option.meta}</span> : null}
                </Link>
              ))}
            </div>
          ))}</div>
          {!groups.length && !loading ? <Link href={`/search?q=${encodeURIComponent(q.trim())}`} onClick={() => saveRecent(q)} className="flex min-h-11 items-center px-3 py-3 text-sm text-muted-foreground">ไม่พบคำแนะนำ เปิดหน้าค้นหาแบบเต็ม</Link> : null}
          <button type="button" onClick={submit} className="mt-1 flex min-h-11 w-full items-center gap-2 border-t border-border px-3 text-left text-sm font-semibold text-[var(--brand-emphasis)]"><Search className="h-4 w-4" />ดูผลค้นหาทั้งหมด</button>
        </div>
      ) : showRecent && recent.length ? (
        <div className="absolute left-0 right-0 top-12 z-50 rounded-[8px] border border-border bg-popover p-1 shadow-[var(--sh-2)]">
          <p className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />ค้นหาล่าสุดบนอุปกรณ์นี้</p>
          <div id={listboxId} role="listbox" aria-label="การค้นหาล่าสุด">
            {recent.map((item, index) => <Link id={`${listboxId}-recent-${index}`} key={item} href={`/search?q=${encodeURIComponent(item)}`} onClick={onNavigate} onMouseEnter={() => setActive(index)} role="option" aria-selected={active === index} className={cn("flex min-h-11 items-center rounded-[6px] px-3 py-2 text-sm hover:bg-muted", active === index && "bg-muted")}>{item}</Link>)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
