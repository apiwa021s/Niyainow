"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchNovels } from "@/services/novel-service";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import { Input } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";

type Tab = "all" | "novels" | "genres" | "tags";

export function SearchResults({ initialQ }: { initialQ: string }) {
  const [q, setQ] = useState(initialQ);
  const [tab, setTab] = useState<Tab>("all");
  const results = useMemo(() => searchNovels(q), [q]);
  const tabs: [Tab, string][] = [["all", "ทั้งหมด"], ["novels", "นิยาย"], ["genres", "หมวดหมู่"], ["tags", "แท็ก"]];

  return (
    <section className="space-y-5">
      <SectionHeader title="ค้นหา" />
      <form action="/search" className="flex gap-2">
        <Input name="q" value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหา system, fantasy, ผู้แต่ง..." className="h-12" />
        <Button type="submit" size="lg"><Search className="h-4 w-4" />ค้นหา</Button>
      </form>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(([value, label]) => (
          <Button key={value} variant={tab === value ? "default" : "secondary"} onClick={() => setTab(value)}>{label}</Button>
        ))}
      </div>
      {q.length < 2 ? <EmptyState title="เริ่มพิมพ์เพื่อค้นหา" description="ค้นหาได้จากชื่อไทย ชื่ออังกฤษ ผู้แต่ง หมวดหมู่ และแท็ก" /> : null}
      {(tab === "all" || tab === "novels") && results.novels.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {results.novels.map((novel) => <NovelCardHorizontal key={novel.slug} novel={novel} />)}
        </div>
      ) : null}
      {(tab === "all" || tab === "genres") && results.genres.length ? (
        <div className="flex flex-wrap gap-2">
          {results.genres.map((genre) => <Link key={genre.slug} href={`/genre/${genre.slug}`}><Badge>{genre.name} · {genre.thaiName}</Badge></Link>)}
        </div>
      ) : null}
      {(tab === "all" || tab === "tags") && results.tags.length ? (
        <div className="flex flex-wrap gap-2">
          {results.tags.map((tag) => <Link key={tag} href={`/tag/${encodeURIComponent(tag.toLowerCase())}`}><Badge>#{tag}</Badge></Link>)}
        </div>
      ) : null}
      {q.length >= 2 && !results.novels.length && !results.genres.length && !results.tags.length ? <EmptyState title="ไม่พบผลลัพธ์" description="ลองใช้คำที่กว้างขึ้น เช่น system, fantasy หรือ magic" /> : null}
    </section>
  );
}
