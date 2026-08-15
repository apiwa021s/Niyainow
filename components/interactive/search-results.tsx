"use client";

import Link from "next/link";
import { Clock3, Search, TrendingUp } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/section";
import type { PublicSearchResult } from "@/services/novel-service";
import type { NovelQuery } from "@/types/novel-query";

type Tab = "all" | "novels" | "authors" | "translators" | "genres" | "tags";
type SearchResultsData = Omit<PublicSearchResult, "novels">;
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

function recentFromSnapshot(snapshot: string, limit: number) {
  try {
    const stored = JSON.parse(snapshot) as unknown;
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string").slice(0, limit) : [];
  } catch {
    return [];
  }
}

function searchHref(q: string, page: number, filters: NovelQuery) {
  const params = new URLSearchParams({ q });
  for (const key of ["genre", "tag", "status", "rating", "chapters", "updated", "content", "sort"] as const) {
    const value = filters[key];
    if (value) params.set(key, String(value));
  }
  if (page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}

function saveRecentSearch(query: string) {
  const cleaned = query.trim().slice(0, 100);
  if (cleaned.length < 2) return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) || "[]") as unknown;
    const current = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([cleaned, ...current.filter((item) => item !== cleaned)].slice(0, 6)));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
  } catch {
    // Search remains fully usable when storage is blocked.
  }
}

export function SearchResults({
  initialQ,
  results,
  novelItems,
  discoveryItems,
  discoveryTitle,
  discoveryDescription,
  discoveryTopics,
  novelFilters,
  filterQuery,
}: {
  initialQ: string;
  results: SearchResultsData;
  novelItems: ReactNode;
  discoveryItems: ReactNode;
  discoveryTitle: string;
  discoveryDescription: string;
  discoveryTopics: ReactNode;
  novelFilters: ReactNode;
  filterQuery: NovelQuery;
}) {
  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<Tab>("all");
  const recentSnapshot = useSyncExternalStore(subscribeRecent, getRecentSnapshot, () => "[]");
  const recent = recentFromSnapshot(recentSnapshot, 6);

  useEffect(() => {
    if (initialQ.length >= 2) saveRecentSearch(initialQ);
  }, [initialQ]);

  const tabs: [Tab, string, number][] = [
    ["all", "ทั้งหมด", results.total + results.authors.length + results.translators.length + results.genres.length + results.tags.length],
    ["novels", "นิยาย", results.total],
    ["authors", "ผู้แต่ง", results.authors.length],
    ["translators", "ผู้แปล", results.translators.length],
    ["genres", "หมวดหมู่", results.genres.length],
    ["tags", "แท็ก", results.tags.length],
  ];
  const hasAnyResults = results.total > 0 || results.authors.length > 0 || results.translators.length > 0 || results.genres.length > 0 || results.tags.length > 0;
  const activeCount = tabs.find(([value]) => value === tab)?.[2] ?? 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const query = q.trim();
    if (query.length < 2) event.preventDefault();
    else saveRecentSearch(query);
  }

  return (
    <section className="space-y-6">
      <header className="border-b border-border pb-5">
        <p className="editorial-kicker">ค้นจากทั้งคลัง</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">ค้นหานิยาย</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">ค้นจากชื่อไทย ชื่อต้นฉบับ ชื่ออื่น ผู้แต่ง ผู้แปล หมวดหมู่ และแท็ก</p>
      </header>

      <form action="/search" onSubmit={onSubmit} className="flex gap-2">
        <Input name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="ชื่อเรื่อง ผู้แต่ง ผู้แปล หรือหมวดหมู่" aria-label="ค้นหาจากชื่อเรื่อง ชื่ออื่น ผู้แต่ง ผู้แปล หมวดหมู่ หรือแท็ก" className="h-12" maxLength={100} minLength={2} />
        {(["genre", "tag", "status", "rating", "chapters", "updated", "content", "sort"] as const).map((key) => (
          filterQuery[key] ? <input key={key} type="hidden" name={key} value={String(filterQuery[key])} /> : null
        ))}
        <Button type="submit" size="lg"><Search className="h-4 w-4" />ค้นหา</Button>
      </form>

      {initialQ.length < 2 ? (
        <div className="space-y-10">
          {recent.length ? (
            <section>
              <div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-[var(--brand-emphasis)]" /><h2 className="font-serif text-xl font-semibold">ค้นหาล่าสุดบนอุปกรณ์นี้</h2></div>
              <div className="flex flex-wrap gap-2">{recent.map((item) => <Link key={item} href={`/search?q=${encodeURIComponent(item)}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm hover:border-[var(--brand-emphasis)]">{item}</Link>)}</div>
            </section>
          ) : null}
          {discoveryTopics}
          <section>
            <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-[var(--brand-emphasis)]" /><div><h2 className="font-serif text-xl font-semibold">{discoveryTitle}</h2><p className="text-xs text-muted-foreground">{discoveryDescription}</p></div></div>
            {discoveryItems}
          </section>
        </div>
      ) : (
        <>
          {novelFilters}

          <div role="group" className="flex gap-2 overflow-x-auto" aria-label="กรองประเภทผลการค้นหา">
            {tabs.map(([value, label, count]) => (
              <Button key={value} type="button" aria-pressed={tab === value} variant={tab === value ? "default" : "secondary"} onClick={() => setTab(value)}>
                {label}<span className="tabular text-xs opacity-70">{count.toLocaleString("th-TH")}</span>
              </Button>
            ))}
          </div>

          {(tab === "all" || tab === "novels") && results.total > 0 ? (
            <section>
              <h2 className="mb-1 font-serif text-xl font-semibold">นิยาย</h2>
              <p className="mb-3 text-xs text-muted-foreground">{results.total.toLocaleString("th-TH")} เรื่องที่ตรงกับ “{initialQ}”</p>
              <div className="grid gap-x-8 lg:grid-cols-2">{novelItems}</div>
              {results.totalPages > 1 ? (
                <nav aria-label="หน้าผลการค้นหา" className="flex items-center justify-center gap-2 pt-5">
                  {results.page > 1 ? <ButtonLink variant="secondary" href={searchHref(initialQ, results.page - 1, filterQuery)}>หน้าก่อน</ButtonLink> : null}
                  <span className="tabular text-sm text-muted-foreground">หน้า {results.page} / {results.totalPages}</span>
                  {results.page < results.totalPages ? <ButtonLink variant="secondary" href={searchHref(initialQ, results.page + 1, filterQuery)}>หน้าถัดไป</ButtonLink> : null}
                </nav>
              ) : null}
            </section>
          ) : null}

          {(tab === "all" || tab === "authors") && results.authors.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-xl font-semibold">ผู้แต่ง</h2>
              <div className="flex flex-wrap gap-2">
                {results.authors.map((author) => (
                  <Link
                    key={author.slug}
                    href={`/search?q=${encodeURIComponent(author.name)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-border px-3 py-2 text-sm hover:border-[var(--brand-emphasis)]"
                  >
                    <span className="font-semibold">{author.name}</span>
                    {author.nativeName && author.nativeName !== author.name ? <span className="text-muted-foreground">{author.nativeName}</span> : null}
                    <span className="text-xs text-muted-foreground">{author.novelCount.toLocaleString("th-TH")} เรื่อง</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {(tab === "all" || tab === "translators") && results.translators.length > 0 ? (
            <section>
              <h2 className="mb-3 font-serif text-xl font-semibold">ผู้แปล</h2>
              <div className="flex flex-wrap gap-2">
                {results.translators.map((translator) => (
                  <Link
                    key={translator.slug}
                    href={`/search?q=${encodeURIComponent(translator.name)}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[6px] border border-border px-3 py-2 text-sm hover:border-[var(--brand-emphasis)]"
                  >
                    <span className="font-semibold">{translator.name}</span>
                    {translator.nativeName && translator.nativeName !== translator.name ? <span className="text-muted-foreground">{translator.nativeName}</span> : null}
                    <span className="text-xs text-muted-foreground">{translator.novelCount.toLocaleString("th-TH")} เรื่อง</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {(tab === "all" || tab === "genres") && results.genres.length > 0 ? (
            <section><h2 className="mb-3 font-serif text-xl font-semibold">หมวดหมู่</h2><div className="flex flex-wrap gap-2">{results.genres.map((genre) => <Link key={genre.slug} href={`/genre/${genre.slug}`} className="inline-flex min-h-11 items-center"><Badge className="px-3 py-2">{genre.thaiName}{genre.name !== genre.thaiName ? ` · ${genre.name}` : ""}</Badge></Link>)}</div></section>
          ) : null}

          {(tab === "all" || tab === "tags") && results.tags.length > 0 ? (
            <section><h2 className="mb-3 font-serif text-xl font-semibold">แท็ก</h2><div className="flex flex-wrap gap-2">{results.tags.map((tag) => <Link key={tag.slug} href={`/tag/${tag.slug}`} className="inline-flex min-h-11 items-center"><Badge className="px-3 py-2">#{tag.name}</Badge></Link>)}</div></section>
          ) : null}

          {!hasAnyResults ? (
            <EmptyState title="ไม่พบผลลัพธ์" description="ลองตรวจการสะกด ใช้คำที่สั้นลง หรือค้นจากชื่อเรื่อง ผู้แต่ง ผู้แปล และหมวดหมู่" action={<ButtonLink href="/novels">สำรวจคลังนิยาย</ButtonLink>} />
          ) : tab !== "all" && activeCount === 0 ? (
            <EmptyState title={`ไม่พบผลลัพธ์ใน${tabs.find(([value]) => value === tab)?.[1] ?? "หมวดนี้"}`} description="ผลลัพธ์ประเภทอื่นอาจยังมีอยู่ เลือกแท็บทั้งหมดเพื่อดูอีกครั้ง" action={<Button type="button" variant="secondary" onClick={() => setTab("all")}>ดูผลลัพธ์ทั้งหมด</Button>} />
          ) : null}
        </>
      )}
    </section>
  );
}
