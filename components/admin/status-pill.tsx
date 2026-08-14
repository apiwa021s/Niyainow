import { cn } from "@/lib/utils";
import type { PillTone } from "@/lib/admin-labels";

/**
 * ป้ายสถานะของตารางหลังบ้าน
 * มีจุดสีนำหน้าเสมอ + ข้อความกำกับ เพื่อไม่ให้สื่อความหมายด้วยสีอย่างเดียว (ส่วนที่ 8)
 */
const TONES: Record<PillTone, { chip: string; dot: string }> = {
  success: { chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  warning: { chip: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  danger: { chip: "border-destructive/25 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  info: {
    chip: "border-[var(--brand-blue)]/25 bg-[var(--brand-blue)]/10 text-[var(--brand-blue-on-light)]",
    dot: "bg-[var(--brand-blue)]"
  },
  brand: {
    chip: "border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/10 text-[var(--brand-light-on-light)]",
    dot: "bg-[var(--brand-primary)]"
  },
  neutral: { chip: "border-border bg-muted text-muted-foreground", dot: "bg-[var(--text-tertiary)]" }
};

export function StatusPill({
  label,
  tone = "neutral",
  className
}: {
  label: string;
  tone?: PillTone;
  className?: string;
}) {
  const style = TONES[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[8px] border px-2 py-1 text-xs font-semibold",
        style.chip,
        className
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {label}
    </span>
  );
}

/** ตัวเลขเดลต้าพร้อมทิศทาง — บวกเขียว ลบแดง และมีเครื่องหมายกำกับเสมอ */
export function DeltaText({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 text-xs font-semibold",
        up ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
        className
      )}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {value.toLocaleString("th-TH")}%
    </span>
  );
}
