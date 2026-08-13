"use client";

import { BookOpen } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { NovelCardHorizontal } from "@/components/novels/novel-card";
import { getNovelBySlug } from "@/services/novel-service";
import { useReaderStore } from "@/stores/use-reader-store";

export function ContinueReading() {
  const history = useReaderStore((state) => state.history);
  const items = history.map((record) => ({ record, novel: getNovelBySlug(record.novelSlug) })).filter((item) => item.novel);

  return (
    <section>
      <SectionHeader title="อ่านต่อ" href="/library/reading" action="ดูทั้งหมด" />
      {items.length ? (
        <div className="grid gap-2.5 md:grid-cols-2">
          {items.slice(0, 4).map(({ record, novel }) =>
            novel ? (
              <div key={novel.slug} className="space-y-1.5 rounded-lg border border-border bg-card p-2">
                <NovelCardHorizontal novel={novel} href={`/novel/${novel.slug}/chapter/${record.chapter}`} />
                <div className="px-2 pb-2">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>ตอนที่ {record.chapter}</span>
                    <span>{record.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${record.progress}%` }} />
                  </div>
                </div>
              </div>
            ) : null
          )}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีเรื่องที่กำลังอ่าน"
          description="ลองค้นหานิยายที่คุณชอบ แล้ว NiyaiNow จะพากลับมาอ่านต่อให้ทันที"
          action={<ButtonLink href="/novels"><BookOpen className="h-4 w-4" />ค้นหานิยาย</ButtonLink>}
        />
      )}
    </section>
  );
}
