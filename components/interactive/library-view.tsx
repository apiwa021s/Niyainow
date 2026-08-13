"use client";

import { Clock, Library, UserRound } from "lucide-react";
import { getNovelBySlug } from "@/services/novel-service";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { useReaderStore } from "@/stores/use-reader-store";

export function LibraryView({ mode }: { mode: "reading" | "bookmarks" | "completed" | "history" }) {
  const { history, bookmarks, completed } = useReaderStore();
  const slugs = mode === "bookmarks" ? bookmarks : mode === "completed" ? completed : history.map((item) => item.novelSlug);
  const novels = slugs.map((slug) => getNovelBySlug(slug)).filter((novel) => novel !== undefined);
  const title = mode === "history" ? "ประวัติการอ่าน" : mode === "bookmarks" ? "บุ๊กมาร์ก" : mode === "completed" ? "อ่านจบแล้ว" : "กำลังอ่าน";

  return (
    <section className="space-y-4">
      <SectionHeader title={title} />
      {novels.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {novels.map((novel) => {
            const record = history.find((item) => item.novelSlug === novel.slug);
            return <NovelCardHorizontal key={novel.slug} novel={novel} href={record ? `/novel/${novel.slug}/chapter/${record.chapter}` : `/novel/${novel.slug}`} />;
          })}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="เมื่อคุณอ่าน ติดตาม หรือบุ๊กมาร์กนิยาย รายการจะมาอยู่ตรงนี้"
          action={<ButtonLink href="/novels">{mode === "history" ? <Clock className="h-4 w-4" /> : mode === "reading" ? <Library className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}สำรวจนิยาย</ButtonLink>}
        />
      )}
    </section>
  );
}
