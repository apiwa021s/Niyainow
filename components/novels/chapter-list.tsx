"use client";

import Link from "next/link";
import { LockKeyhole, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input, Select } from "@/components/ui/form-controls";
import type { ChapterSummary } from "@/types/novel";

export function ChapterList({ slug, chapters }: { slug: string; chapters: ChapterSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return chapters
      .filter((chapter) => !needle || chapter.title.toLocaleLowerCase("th").includes(needle) || String(chapter.number).includes(needle))
      .sort((a, b) => sort === "latest" ? (b.sortOrder ?? b.number) - (a.sortOrder ?? a.number) : (a.sortOrder ?? a.number) - (b.sortOrder ?? b.number));
  }, [chapters, query, sort]);

  return (
    <section aria-label="รายชื่อตอน" className="overflow-hidden rounded-[8px] border border-border bg-card">
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="relative">
          <span className="sr-only">ค้นหาตอน</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขตอนหรือชื่อตอน" className="pl-9" />
        </label>
        <label>
          <span className="sr-only">เรียงลำดับตอน</span>
          <Select value={sort} onChange={(event) => setSort(event.target.value as "latest" | "oldest")}>
            <option value="latest">ตอนล่าสุดก่อน</option>
            <option value="oldest">ตอนเก่าก่อน</option>
          </Select>
        </label>
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/55 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="w-32 px-4 py-3 font-medium">ตอน</th>
              <th scope="col" className="px-4 py-3 font-medium">ชื่อตอน</th>
              <th scope="col" className="w-36 px-4 py-3 font-medium">อัปเดต</th>
              <th scope="col" className="w-28 px-4 py-3 text-right font-medium">จำนวนคำ</th>
              <th scope="col" className="w-24 px-4 py-3 text-right font-medium">ราคา</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((chapter) => {
              const href = `/novel/${slug}/chapter/${chapter.number}`;
              return (
                <tr key={chapter.id ?? chapter.number} className="transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
                  <td className="px-4 py-3"><Link href={href} className="font-mono text-xs text-[var(--brand-primary)]">CH. {chapter.number}</Link></td>
                  <td className="px-4 py-3"><Link href={href} className="font-medium hover:text-[var(--brand-primary)]">{chapter.title}</Link></td>
                  <td className="tabular px-4 py-3 text-xs text-muted-foreground">{chapter.updatedAt}</td>
                  <td className="tabular px-4 py-3 text-right text-xs text-muted-foreground">{chapter.wordCount?.toLocaleString("th-TH") ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-xs font-medium">{chapter.locked ? <span className="inline-flex items-center gap-1 text-muted-foreground"><LockKeyhole className="h-3 w-3" />จำกัด</span> : <span className="text-[var(--brand-primary)]">ฟรี</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border sm:hidden">
        {filtered.map((chapter) => (
          <li key={chapter.id ?? chapter.number}>
            <Link href={`/novel/${slug}/chapter/${chapter.number}`} className="block min-h-[76px] px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]">
              <div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-[var(--brand-primary)]">CH. {chapter.number}</span><span className="text-[11px] text-muted-foreground">{chapter.updatedAt}</span></div>
              <p className="mt-1 font-medium leading-[1.6]">{chapter.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{chapter.wordCount?.toLocaleString("th-TH") ?? "—"} คำ · {chapter.locked ? "จำกัดการเข้าถึง" : "ฟรี"}</p>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">ไม่พบตอนที่ตรงกับคำค้น</p> : null}
    </section>
  );
}
