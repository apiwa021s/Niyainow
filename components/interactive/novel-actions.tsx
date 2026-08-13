"use client";

import { Bell, Bookmark, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useReaderStore } from "@/stores/use-reader-store";

export function FollowButton({ slug }: { slug: string }) {
  const follows = useReaderStore((state) => state.follows);
  const toggleFollow = useReaderStore((state) => state.toggleFollow);
  const active = follows.includes(slug);
  return (
    <Button variant={active ? "secondary" : "outline"} onClick={() => toggleFollow(slug)}>
      {active ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {active ? "ติดตามแล้ว" : "ติดตามเรื่อง"}
    </Button>
  );
}

export function BookmarkButton({ slug }: { slug: string }) {
  const bookmarks = useReaderStore((state) => state.bookmarks);
  const toggleBookmark = useReaderStore((state) => state.toggleBookmark);
  const active = bookmarks.includes(slug);
  return (
    <Button variant={active ? "secondary" : "ghost"} size="icon" onClick={() => toggleBookmark(slug)} aria-label="บุ๊กมาร์ก" title="บุ๊กมาร์ก">
      <Bookmark className={active ? "h-4 w-4 fill-current text-[var(--brand-accent)]" : "h-4 w-4"} />
    </Button>
  );
}

/**
 * ปุ่มบุ๊กมาร์กบนปกการ์ด (ส่วนที่ 6.3)
 * mobile แสดงตลอด / desktop โผล่ตอน hover — ผู้เรียกคุมความทึบเอง
 * Optimistic UI: เปลี่ยน state ทันที (ส่วนที่ 4 ข้อ 5)
 */
export function BookmarkToggle({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const bookmarks = useReaderStore((state) => state.bookmarks);
  const toggleBookmark = useReaderStore((state) => state.toggleBookmark);
  const active = bookmarks.includes(slug);
  const { toast } = useToast();

  // Optimistic: state เปลี่ยนทันที แล้วแจ้งผลพร้อมปุ่มเลิกทำ (ส่วนที่ 4 ข้อ 5)
  const handleToggle = () => {
    toggleBookmark(slug);
    toast({
      tone: "success",
      message: active ? "เอาออกจากบุ๊กมาร์กแล้ว" : "บันทึกลงบุ๊กมาร์กแล้ว",
      action: { label: "เลิกทำ", onClick: () => toggleBookmark(slug) }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={active}
      aria-label={active ? "เอาออกจากบุ๊กมาร์ก" : "บุ๊กมาร์กเรื่องนี้"}
      title={active ? "เอาออกจากบุ๊กมาร์ก" : "บุ๊กมาร์กเรื่องนี้"}
      className={cn(
        "grid place-items-center rounded-[8px] bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75",
        compact ? "h-8 w-8" : "h-11 w-11"
      )}
    >
      <Bookmark className={cn("h-4 w-4", active && "fill-[var(--brand-pink)] text-[var(--brand-pink)]")} />
    </button>
  );
}

export function CompleteButton({ slug }: { slug: string }) {
  const completed = useReaderStore((state) => state.completed);
  const markCompleted = useReaderStore((state) => state.markCompleted);
  const active = completed.includes(slug);
  return (
    <Button variant={active ? "secondary" : "outline"} onClick={() => markCompleted(slug)}>
      <Heart className={active ? "h-4 w-4 fill-current" : "h-4 w-4"} />
      {active ? "อ่านจบแล้ว" : "ทำเครื่องหมายว่าอ่านจบ"}
    </Button>
  );
}
