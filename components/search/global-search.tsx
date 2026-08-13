"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { searchNovels } from "@/services/novel-service";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export function GlobalSearch({ mode, onNavigate }: { mode: "inline" | "mobile"; onNavigate?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchNovels(q), [q]);
  const options = [
    ...results.novels.map((novel) => ({ label: novel.thaiTitle, meta: novel.title, href: `/novel/${novel.slug}` })),
    ...results.genres.map((genre) => ({ label: genre.name, meta: "หมวดหมู่", href: `/genre/${genre.slug}` })),
    ...results.tags.map((tag) => ({ label: tag, meta: "Tag", href: `/tag/${encodeURIComponent(tag.toLowerCase())}` }))
  ].slice(0, 8);

  function go(href: string) {
    onNavigate?.();
    router.push(href);
  }

  function submit() {
    if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
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
    if (event.key === "Escape") setQ("");
  }

  return (
    <div className={cn("relative", mode === "inline" ? "w-full max-w-md" : "w-full")}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="ค้นหานิยาย..."
        className="pl-9 pr-10"
        aria-label="ค้นหานิยาย"
      />
      {q ? (
        <button onClick={() => setQ("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-white/10" aria-label="ล้างคำค้น">
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {q.length >= 2 ? (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-2xl">
          <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">ค้นหา “{q}”</div>
          {options.length ? (
            <div className="max-h-80 overflow-auto p-1">
              {options.map((option, index) => (
                <Link
                  key={option.href + option.label}
                  href={option.href}
                  onClick={onNavigate}
                  className={cn("block rounded-md px-3 py-2 text-sm hover:bg-white/10", active === index && "bg-white/10")}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{option.meta}</span>
                </Link>
              ))}
            </div>
          ) : (
            <Link href={`/search?q=${encodeURIComponent(q)}`} onClick={onNavigate} className="block px-3 py-4 text-sm text-muted-foreground">
              ไม่พบคำแนะนำ เปิดหน้าค้นหา
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
