import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * โครงหน้า (ใช้ทุกหน้า)
 * pt-20 เผื่อความสูง header ที่ fixed อยู่ · pb-24 เผื่อ bottom nav บนมือถือ
 * id="main" ให้ skip link กระโดดมาถึง (ส่วนที่ 8)
 */
export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" className={cn("mx-auto w-full max-w-[1440px] px-4 pb-24 pt-[88px] sm:px-6 lg:px-8", className)}>
      {children}
    </main>
  );
}

/** หัวหน้าเพจ — ใช้กับ h1 ของแต่ละหน้า */
export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="editorial-kicker mb-1" aria-hidden>物語 / STORY</p>
        <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** หัวข้อ section ภายในหน้า */
export function SectionHeader({
  title,
  description,
  href,
  action,
  icon
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-8 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
          {icon}
          <div>
            <p className="editorial-kicker" aria-hidden>NIYAI / 読む</p>
            <h2 className="font-serif text-xl font-semibold sm:text-2xl">{title}</h2>
          </div>
        </div>
        {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {href && action ? (
        <Link
          href={href}
          className="shrink-0 rounded-[8px] px-2 py-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted"
        >
          {action} 
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Empty state (ส่วนที่ 7) — ทุกหน้าที่มี list ต้องมี
 * ภาพประกอบ + ข้อความอธิบาย + ปุ่ม action เพื่อไม่ให้เป็น dead end (ส่วนที่ 4 ข้อ 3)
 */
export function EmptyState({
  title,
  description,
  action,
  icon
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[8px] border border-dashed border-border px-6 py-10 text-center">
      <div aria-hidden className="mb-3 grid h-14 w-14 place-items-center border border-[var(--brand-primary)]/35 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]">
        {icon ?? <BookGlyph />}
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Error state (ส่วนที่ 7) — บอกว่าเกิดอะไร + วิธีแก้ ห้ามโชว์ error code ล้วน */
export function ErrorState({
  title = "โหลดข้อมูลไม่สำเร็จ",
  description = "การเชื่อมต่ออาจมีปัญหาชั่วคราว ลองอีกครั้งได้เลย",
  action
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[16px] border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Skeleton — ใช้ .skeleton จาก globals.css ให้ shimmer เหมือนกันทั้งระบบ */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} aria-hidden />;
}

function BookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
