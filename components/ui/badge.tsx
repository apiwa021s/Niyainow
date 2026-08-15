import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { NovelStatus } from "@/types/novel";

export type BadgeTone = "neutral" | "genre" | "brand" | "new" | "hot" | "muted";

const tones: Record<BadgeTone, string> = {
  neutral: "border border-border bg-card text-muted-foreground",
  genre: "border border-border bg-transparent text-muted-foreground",
  brand: "border border-transparent bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]",
  new: "border border-transparent bg-[var(--brand-pink)] text-white",
  hot: "border border-transparent bg-[var(--brand-primary)] text-white",
  muted: "border border-transparent bg-muted text-muted-foreground"
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

const STATUS_TONE: Record<NovelStatus, { tone: BadgeTone; label: string; dot: string }> = {
  ongoing: { tone: "brand", label: "กำลังแปล", dot: "bg-emerald-500" },
  completed: { tone: "muted", label: "จบแล้ว", dot: "bg-[var(--brand-blue)]" },
  hiatus: { tone: "muted", label: "พักการแปล", dot: "bg-amber-500" }
};

/** ป้ายสถานะการแปล — อ่านอย่างเดียว มีจุดสีนำเพื่อไม่ต้องพึ่งสีอย่างเดียว (ส่วนที่ 8) */
export function StatusBadge({ status, className }: { status: NovelStatus; className?: string }) {
  const config = STATUS_TONE[status];
  return (
    <Badge tone={config.tone} className={className}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </Badge>
  );
}
