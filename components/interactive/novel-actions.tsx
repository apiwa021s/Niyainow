"use client";

import { Bell, Bookmark, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
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
