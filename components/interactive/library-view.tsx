import { Clock, Library, UserRound } from "lucide-react";

import { NovelListItem } from "@/components/novels/novel-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, SectionHeader } from "@/components/ui/section";
import type { UserNovelListItem } from "@/services/user-service";

type LibraryMode = "reading" | "bookmarks" | "completed" | "history";

const TITLES: Record<LibraryMode, string> = {
  reading: "กำลังอ่าน",
  bookmarks: "รายการไว้อ่าน",
  completed: "อ่านจบแล้ว",
  history: "ประวัติการอ่าน",
};

export function LibraryView({ mode, items }: { mode: LibraryMode; items: UserNovelListItem[] }) {
  return (
    <section className="space-y-4">
      <SectionHeader title={TITLES[mode]} />
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const href = item.chapter
              ? `/novel/${item.novel.slug}/chapter/${item.chapter.number}`
              : `/novel/${item.novel.slug}`;
            const progress = item.progressPercent === null ? undefined : Math.round(item.progressPercent);
            return (
              <NovelListItem
                key={item.novel.slug}
                novel={item.novel}
                href={href}
                chapterLabel={item.chapter ? `ตอนที่ ${item.chapter.number}: ${item.chapter.title}` : undefined}
                progress={progress}
                meta={item.lastReadAt ? new Date(item.lastReadAt).toLocaleDateString("th-TH") : undefined}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="ยังไม่มีรายการ"
          description="เมื่อคุณเริ่มอ่านหรือเพิ่มนิยายเข้าคลัง รายการจะปรากฏที่นี่และซิงก์กับบัญชีของคุณ"
          action={
            <ButtonLink href="/novels">
              {mode === "history" ? (
                <Clock className="h-4 w-4" />
              ) : mode === "reading" ? (
                <Library className="h-4 w-4" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
              สำรวจนิยาย
            </ButtonLink>
          }
        />
      )}
    </section>
  );
}
