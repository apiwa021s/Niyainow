"use client";

import {
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  Coins,
  CreditCard,
  LoaderCircle,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { NotificationFeedItem, NotificationFeedPage, NotificationType } from "@/types/notification";

type Filter = "all" | "unread";

const iconByType: Record<NotificationType, typeof Bell> = {
  new_chapter: BookOpen,
  new_story_from_writer: BookOpen,
  writer_post: Megaphone,
  early_access: Sparkles,
  membership: Sparkles,
  coin_purchase: Coins,
  chapter_purchase: CreditCard,
  chapter_published: BookOpen,
  scheduled_publish: Bell,
  fan_summary: Bell,
  membership_summary: Sparkles,
  earnings_summary: Coins,
};

const notificationTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

function announceUnreadCount(unreadCount: number) {
  window.dispatchEvent(new CustomEvent("niyainow:notifications-updated", { detail: { unreadCount } }));
}

async function fetchFeed(filter: Filter, cursor?: string | null) {
  const query = new URLSearchParams({ limit: "20" });
  if (filter === "unread") query.set("unread", "true");
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`/api/me/notifications?${query}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("notification_feed_failed");
  const payload = (await response.json()) as { data?: NotificationFeedPage };
  if (!payload.data) throw new Error("notification_feed_invalid");
  return payload.data;
}

function formatNotificationTime(value: string) {
  return notificationTimeFormatter.format(new Date(value));
}

export function NotificationList({ initialFeed }: { initialFeed: NotificationFeedPage }) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState(initialFeed.items);
  const [unreadCount, setUnreadCount] = useState(initialFeed.unreadCount);
  const [nextCursor, setNextCursor] = useState(initialFeed.nextCursor);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const updateUnreadCount = (value: number) => {
    const next = Math.max(0, value);
    setUnreadCount(next);
    announceUnreadCount(next);
  };

  const adjustUnreadCount = (delta: number) => {
    setUnreadCount((current) => {
      const next = Math.max(0, current + delta);
      announceUnreadCount(next);
      return next;
    });
  };

  const selectFilter = (nextFilter: Filter) => {
    if (nextFilter === filter || pending) return;
    startTransition(async () => {
      try {
        const feed = await fetchFeed(nextFilter);
        setFilter(nextFilter);
        setItems(feed.items);
        setNextCursor(feed.nextCursor);
        updateUnreadCount(feed.unreadCount);
      } catch {
        toast({ tone: "error", message: "โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const markRead = async (item: NotificationFeedItem) => {
    if (item.isRead || pendingIds.has(item.id)) return true;
    setPendingIds((current) => new Set(current).add(item.id));
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, isRead: true } : candidate));
    adjustUnreadCount(-1);
    try {
      const response = await fetch(`/api/me/notifications/${item.id}/read`, { method: "PATCH" });
      if (!response.ok) throw new Error("notification_read_failed");
      if (filter === "unread") setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      return true;
    } catch {
      setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, isRead: false } : candidate));
      adjustUnreadCount(1);
      toast({ tone: "error", message: "บันทึกสถานะอ่านแล้วไม่สำเร็จ" });
      return false;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  };

  const openItem = async (item: NotificationFeedItem) => {
    if (!(await markRead(item))) return;
    if (item.href) router.push(item.href);
  };

  const markAllRead = () => {
    if (!unreadCount || pending || pendingIds.size > 0) return;
    const previousItems = items;
    const previousCount = unreadCount;
    setItems((current) => filter === "unread" ? [] : current.map((item) => ({ ...item, isRead: true })));
    updateUnreadCount(0);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/notifications/read-all", { method: "POST" });
        if (!response.ok) throw new Error("notification_read_all_failed");
        setNextCursor(filter === "unread" ? null : nextCursor);
        toast({ tone: "success", message: "อ่านการแจ้งเตือนทั้งหมดแล้ว" });
      } catch {
        setItems(previousItems);
        updateUnreadCount(previousCount);
        toast({ tone: "error", message: "บันทึกสถานะไม่สำเร็จ กรุณาลองอีกครั้ง" });
      }
    });
  };

  const loadMore = () => {
    if (!nextCursor || pending) return;
    startTransition(async () => {
      try {
        const feed = await fetchFeed(filter, nextCursor);
        setItems((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          return [...current, ...feed.items.filter((item) => !existingIds.has(item.id))];
        });
        setNextCursor(feed.nextCursor);
        updateUnreadCount(feed.unreadCount);
      } catch {
        toast({ tone: "error", message: "โหลดการแจ้งเตือนเพิ่มเติมไม่สำเร็จ" });
      }
    });
  };

  return (
    <section aria-labelledby="notification-feed-title" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="notification-feed-title" className="text-h2 font-semibold">รายการแจ้งเตือน</h2>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {unreadCount ? `ยังไม่ได้อ่าน ${unreadCount.toLocaleString("th-TH")} รายการ` : "คุณอ่านครบแล้ว"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={!unreadCount || pending}>
          <CheckCheck className="h-4 w-4" /> อ่านทั้งหมด
        </Button>
      </div>

      <div className="flex gap-1" role="tablist" aria-label="กรองการแจ้งเตือน">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => selectFilter(value)}
            disabled={pending}
            className={cn(
              "min-h-11 rounded-[6px] px-4 text-sm font-semibold transition-colors",
              filter === value ? "bg-[var(--brand-primary)] text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {value === "all" ? "ทั้งหมด" : "ยังไม่ได้อ่าน"}
          </button>
        ))}
      </div>

      {items.length ? (
        <ol className="divide-y divide-border border-y border-border" aria-busy={pending}>
          {items.map((item) => {
            const Icon = iconByType[item.type];
            const itemPending = pendingIds.has(item.id);
            return (
              <li key={item.id} className={cn("relative", !item.isRead && "bg-[var(--brand-primary)]/[0.045]")}>
                <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-3 py-4 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center">
                  <span className={cn(
                    "grid h-11 w-11 place-items-center rounded-[6px]",
                    item.isRead ? "bg-muted text-muted-foreground" : "bg-[var(--brand-primary)]/12 text-[var(--brand-emphasis)]",
                  )}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className="min-w-0 text-left disabled:cursor-wait"
                    disabled={itemPending}
                  >
                    <span className="flex items-center gap-2">
                      {!item.isRead ? (
                        <>
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand-primary)]" aria-hidden />
                          <span className="sr-only">ยังไม่ได้อ่าน</span>
                        </>
                      ) : null}
                      <span className={cn("truncate text-sm", !item.isRead && "font-semibold")}>{item.title}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{item.body}</span>
                    <time dateTime={item.createdAt} className="mt-1.5 block text-xs tabular-nums text-muted-foreground">
                      {formatNotificationTime(item.createdAt)} น.
                    </time>
                  </button>
                  {!item.isRead ? (
                    <button
                      type="button"
                      onClick={() => void markRead(item)}
                      disabled={itemPending}
                      aria-label={`ทำเครื่องหมายว่าอ่านแล้ว: ${item.title}`}
                      title="ทำเครื่องหมายว่าอ่านแล้ว"
                      className="grid h-11 w-11 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-wait"
                    >
                      {itemPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                  ) : <span className="hidden sm:block" />}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-[8px] border border-dashed border-border px-5 py-10 text-center">
          <Bell className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
          <h3 className="mt-3 font-semibold">{filter === "unread" ? "ไม่มีรายการที่ยังไม่ได้อ่าน" : "ยังไม่มีการแจ้งเตือน"}</h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
            {filter === "unread" ? "เยี่ยมเลย คุณติดตามข่าวสารครบแล้ว" : "ติดตามนิยายที่สนใจ แล้วตอนใหม่จะแจ้งที่นี่"}
          </p>
          {filter === "all" ? <ButtonLink href="/novels" variant="outline" className="mt-5">สำรวจนิยาย</ButtonLink> : null}
        </div>
      )}

      {nextCursor ? (
        <div className="flex justify-center pt-1">
          <Button variant="outline" onClick={loadMore} loading={pending}>โหลดเพิ่มเติม</Button>
        </div>
      ) : null}
    </section>
  );
}
