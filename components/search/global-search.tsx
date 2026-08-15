"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";

import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

type Suggestion = { label: string; meta: string; href: string };

export function GlobalSearch({ mode, onNavigate }: { mode: "inline" | "mobile"; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("suggestion request failed");
        const payload = (await response.json()) as { suggestions?: Suggestion[] };
        setOptions(Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 8) : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  function go(href: string) {
    onNavigate?.();
    setQ("");
    router.push(href);
  }

  function submit() {
    const query = q.trim();
    if (query) go(`/search?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => Math.min(value + 1, Math.max(options.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => Math.max(value - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (options[active]) go(options[active].href);
      else submit();
    }
    if (event.key === "Escape") {
      setQ("");
      setOptions([]);
    }
  }

  return (
    <div className={cn("relative", mode === "inline" ? "w-full max-w-md" : "w-full")}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(event) => {
          const next = event.target.value.slice(0, 100);
          setQ(next);
          if (next.trim().length < 2) {
            setOptions([]);
            setLoading(false);
          }
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="ค้นหาชื่อนิยาย ผู้แต่ง หรือหมวดหมู่"
        className="pl-9 pr-10"
        aria-label="ค้นหานิยาย"
        aria-autocomplete="list"
        aria-expanded={q.trim().length >= 2}
        maxLength={100}
      />
      {q ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setOptions([]);
          }}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="ล้างคำค้น"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl" role="listbox">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
            {loading ? "กำลังค้นหา…" : `ค้นหา “${q.trim()}”`}
          </div>
          {options.length > 0 ? (
            <div className="max-h-80 overflow-auto p-1">
              {options.map((option, index) => (
                <Link
                  key={option.href + option.label}
                  href={option.href}
                  onClick={() => {
                    onNavigate?.();
                    setQ("");
                  }}
                  role="option"
                  aria-selected={active === index}
                  className={cn("block rounded-md px-3 py-2 text-sm hover:bg-muted", active === index && "bg-muted")}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{option.meta}</span>
                </Link>
              ))}
            </div>
          ) : !loading ? (
            <Link
              href={`/search?q=${encodeURIComponent(q.trim())}`}
              onClick={onNavigate}
              className="block px-3 py-4 text-sm text-muted-foreground"
            >
              ไม่พบคำแนะนำ เปิดหน้าค้นหา
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
