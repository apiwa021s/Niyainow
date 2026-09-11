"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function FollowNotificationToggle({
  slug,
  initialEnabled,
}: {
  slug: string;
  initialEnabled: boolean;
}) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    if (pending) return;
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/follows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, notificationsEnabled: next }),
        });
        if (!response.ok) throw new Error("follow_notification_update_failed");
        toast({
          tone: "success",
          message: next ? "เปิดแจ้งเตือนตอนใหม่แล้ว" : "ปิดแจ้งเตือนตอนใหม่แล้ว แต่ยังติดตามเรื่องนี้อยู่",
        });
      } catch {
        setEnabled(!next);
        toast({ tone: "error", message: "เปลี่ยนการตั้งค่าแจ้งเตือนไม่สำเร็จ" });
      }
    });
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[6px] border px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70",
        enabled
          ? "border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/8 text-[var(--brand-emphasis)]"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
      {enabled ? "แจ้งเตือนอยู่" : "ปิดแจ้งเตือน"}
    </button>
  );
}
