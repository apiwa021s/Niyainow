"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";

import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/section";
import type { PublicSearchResult } from "@/services/novel-service";

type Tab = "all" | "novels" | "genres" | "tags";

function searchHref(q: string, page: number) {
  const params = new URLSearchParams({ q });
  if (page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}

export function SearchResults({ initialQ, results }: { initialQ: string; results: PublicSearchResult }) {
  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<Tab>("all");
  const tabs: [Tab, string][] = [
    ["all", "ทั้งหมด"],
    ["novels", "นิยาย"],
    ["genres", "หมวดหมู่"],
    ["tags", "แท็ก"],
  ];
  const hasResults = results.novels.length > 0 || results.genres.length > 0 || results.tags.length > 0;

  return (
    <section className="space-y-5">
      <div>
        <p className="editorial-kicker">SEARCH / 探す</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">ค้นหานิยาย</h1>
        <p className="mt-2 text-sm text-muted-foreground">ชื่อเรื่อง ผู้แต่ง ชื่อรอง หมวดหมู่ และแท็ก—ค้นหาได้จากจุดเดียว</p>
      </div>
      <form action="/search" className="flex gap-2">
        <Input
          name="q"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="ค้นหาชื่อเรื่อง ผู้แต่ง หมวดหมู่ หรือแท็ก"
          className="h-12"
          maxLength={100}
        />
        <Button type="submit" size="lg"><Search className="h-4 w-4" />ค้นหา</Button>
      </form>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([value, label]) => (
          <Button key={value} type="button" variant={tab === value ? "default" : "secondary"} onClick={() => setTab(value)}>
            {label}
          </Button>
        ))}
      </div>

      {initialQ.length < 2 ? (
        <EmptyState title="เริ่มพิมพ์เพื่อค้นหา" description="ค้นหาได้จากชื่อไทย ชื่อต้นฉบับ ชื่ออื่น ผู้แต่ง หมวดหมู่ และแท็ก" />
      ) : null}

      {(tab === "all" || tab === "novels") && results.novels.length > 0 ? (
        <div className="space-y-3">
          {tab === "all" ? <h2 className="font-semibold">นิยาย ({results.total.toLocaleString("th-TH")})</h2> : null}
          <div className="grid gap-3 md:grid-cols-2">
            {results.novels.map((novel) => <NovelCardHorizontal key={novel.slug} novel={novel} highlight={initialQ} />)}
          </div>
          {results.totalPages > 1 ? (
            <nav aria-label="หน้าผลการค้นหา" className="flex items-center justify-center gap-2 pt-2">
              {results.page > 1 ? <ButtonLink variant="secondary" href={searchHref(initialQ, results.page - 1)}>หน้าก่อน</ButtonLink> : null}
              <span className="tabular text-sm text-muted-foreground">หน้า {results.page} / {results.totalPages}</span>
              {results.page < results.totalPages ? <ButtonLink variant="secondary" href={searchHref(initialQ, results.page + 1)}>หน้าถัดไป</ButtonLink> : null}
            </nav>
          ) : null}
        </div>
      ) : null}

      {(tab === "all" || tab === "genres") && results.genres.length > 0 ? (
        <section>
          {tab === "all" ? <h2 className="mb-2 font-semibold">หมวดหมู่</h2> : null}
          <div className="flex flex-wrap gap-2">
            {results.genres.map((genre) => (
              <Link key={genre.slug} href={`/genre/${genre.slug}`}><Badge>{genre.name} · {genre.thaiName}</Badge></Link>
            ))}
          </div>
        </section>
      ) : null}

      {(tab === "all" || tab === "tags") && results.tags.length > 0 ? (
        <section>
          {tab === "all" ? <h2 className="mb-2 font-semibold">แท็ก</h2> : null}
          <div className="flex flex-wrap gap-2">
            {results.tags.map((tag) => <Link key={tag.slug} href={`/tag/${tag.slug}`}><Badge>#{tag.name}</Badge></Link>)}
          </div>
        </section>
      ) : null}

      {initialQ.length >= 2 && !hasResults ? (
        <EmptyState title="ไม่พบผลลัพธ์" description="ลองสะกดใหม่ หรือใช้คำค้นที่สั้นและกว้างขึ้น" />
      ) : null}
    </section>
  );
}
