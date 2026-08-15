import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { DeltaText } from "@/components/admin/status-pill";
import { cn } from "@/lib/utils";

/* =========================================================================
   ชิ้นส่วนหน้าตาที่ใช้ซ้ำทุกหน้าหลังบ้าน
   ไม่มี state — ใช้ได้ทั้งใน server component และ client component
   ========================================================================= */

export type Crumb = { label: string; href?: string };

/** หัวหน้าเพจหลังบ้าน — breadcrumb + h1 + ปุ่มคำสั่งหลัก */
export function AdminPageHeader({
  title,
  description,
  crumbs = [],
  actions
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs.length > 0 ? (
        <nav aria-label="เส้นทางหน้า" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight aria-hidden className="h-3 w-3" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="rounded px-0.5 hover:text-foreground hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** กล่องเนื้อหาย่อยในหน้า — มีหัวข้อ คำอธิบาย และปุ่มมุมขวา */
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]", className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** การ์ดตัวเลขสรุป — ค่าหลักตัวใหญ่ + เดลต้าเทียบช่วงก่อน + พื้นที่ว่างสำหรับกราฟเล็ก */
export function StatCard({
  label,
  value,
  unit,
  delta,
  hint,
  icon,
  chart
}: {
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  hint?: string;
  icon?: ReactNode;
  chart?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-[var(--sh-1)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="tabular mt-1 flex items-baseline gap-1 text-2xl font-bold">
            {typeof value === "number" ? value.toLocaleString("th-TH") : value}
            {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
          </p>
        </div>
        {icon ? (
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"
          >
            {icon}
          </span>
        ) : null}
      </div>

      {chart ? <div className="min-h-10">{chart}</div> : null}

      {delta !== undefined || hint ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {delta !== undefined ? <DeltaText value={delta} /> : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** แถวข้อมูล label/value ในการ์ดรายละเอียด */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 py-2.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * ลิงก์งานค้าง — ใช้บนแดชบอร์ด
 * ตัวเลข 0 ยังต้องแสดง เพื่อให้เห็นว่า "เคลียร์แล้ว" ไม่ใช่ "ไม่มีเมนูนี้"
 */
export function TaskLink({
  href,
  label,
  count,
  tone = "neutral",
  icon
}: {
  href: string;
  label: string;
  count: number;
  tone?: "neutral" | "warning" | "danger";
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-[12px] border border-border bg-card px-3 py-3 transition-colors hover:bg-muted"
    >
      <span
        aria-hidden
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-[10px]",
          tone === "danger" && count > 0
            ? "bg-destructive/10 text-destructive"
            : tone === "warning" && count > 0
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      <span
        className={cn(
          "tabular grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-bold",
          count === 0 ? "bg-muted text-muted-foreground" : "bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
        )}
      >
        {count.toLocaleString("th-TH")}
      </span>
    </Link>
  );
}
