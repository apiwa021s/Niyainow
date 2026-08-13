"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getGenres, getNovels, type NovelQuery } from "@/services/novel-service";
import { NovelCard } from "@/components/novels/novel-card";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import { Select } from "@/components/ui/form-controls";

const statusOptions = [
  ["all", "ทั้งหมด"],
  ["ongoing", "กำลังแปล"],
  ["completed", "จบแล้ว"],
  ["hiatus", "พัก"]
] as const;

export function NovelBrowser({ initialQuery = {}, title = "นิยายทั้งหมด" }: { initialQuery?: NovelQuery; title?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState<NovelQuery>(initialQuery);
  const [page, setPage] = useState(1);
  const [mobileFilters, setMobileFilters] = useState(false);
  const pageSize = 8;
  const novels = useMemo(() => getNovels(query), [query]);
  const totalPages = Math.max(1, Math.ceil(novels.length / pageSize));
  const visible = novels.slice((page - 1) * pageSize, page * pageSize);

  function update(next: NovelQuery) {
    setQuery(next);
    setPage(1);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    router.replace(params.size ? `/novels?${params.toString()}` : "/novels", { scroll: false });
  }

  const filters = (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm">
        หมวดหมู่
        <Select value={query.genre ?? "all"} onChange={(event) => update({ ...query, genre: event.target.value === "all" ? undefined : event.target.value })}>
          <option value="all">ทั้งหมด</option>
          {getGenres().map((genre) => <option key={genre.slug} value={genre.slug}>{genre.name}</option>)}
        </Select>
      </label>
      <label className="grid gap-2 text-sm">
        สถานะ
        <Select value={query.status ?? "all"} onChange={(event) => update({ ...query, status: event.target.value as NovelQuery["status"] })}>
          {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </label>
      <label className="grid gap-2 text-sm">
        คะแนน
        <Select value={query.rating ?? "all"} onChange={(event) => update({ ...query, rating: event.target.value as NovelQuery["rating"] })}>
          <option value="all">ทั้งหมด</option>
          <option value="4">4+</option>
          <option value="3">3+</option>
        </Select>
      </label>
      <label className="grid gap-2 text-sm">
        จำนวนตอน
        <Select value={query.chapters ?? "all"} onChange={(event) => update({ ...query, chapters: event.target.value as NovelQuery["chapters"] })}>
          <option value="all">ทั้งหมด</option>
          <option value="1-50">1-50</option>
          <option value="51-100">51-100</option>
          <option value="101-300">101-300</option>
          <option value="300+">300+</option>
        </Select>
      </label>
      <label className="grid gap-2 text-sm">
        เรียงตาม
        <Select value={query.sort ?? "popular"} onChange={(event) => update({ ...query, sort: event.target.value as NovelQuery["sort"] })}>
          <option value="popular">ยอดนิยม</option>
          <option value="latest">ล่าสุด</option>
          <option value="rating">คะแนนสูงสุด</option>
          <option value="updated">อัปเดตล่าสุด</option>
          <option value="az">ชื่อ A-Z</option>
        </Select>
      </label>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="hidden rounded-lg border border-border bg-card p-4 lg:block">
        <h2 className="mb-4 font-semibold">ตัวกรอง</h2>
        {filters}
      </aside>
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionHeader title={title} />
          <Button className="lg:hidden" variant="outline" onClick={() => setMobileFilters(true)}><SlidersHorizontal className="h-4 w-4" />ตัวกรอง</Button>
        </div>
        {visible.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((novel) => <NovelCard key={novel.slug} novel={novel} />)}
          </div>
        ) : (
          <EmptyState title="ไม่พบนิยาย" description="ลองเปลี่ยนตัวกรองหรือคำค้นหาอีกครั้ง" />
        )}
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="secondary" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>ถัดไป</Button>
        </div>
      </section>
      {mobileFilters ? (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileFilters(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-lg border border-border bg-background p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">ตัวกรอง</h2>
              <Button variant="ghost" onClick={() => setMobileFilters(false)}>เสร็จ</Button>
            </div>
            {filters}
          </div>
        </div>
      ) : null}
    </div>
  );
}
