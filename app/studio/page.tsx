import { ArrowRight, BookMarked, CheckCircle2, Circle, Plus } from "lucide-react";
import Link from "next/link";

import { DashboardStats } from "@/components/studio/dashboard-stats";
import {
  baht,
  studioIsNewCreator,
  studioReviewHours,
  studioSummary,
  studioTasks,
  studioWorks,
  whole,
  workStatusLabels,
} from "@/components/studio/mock-data";
import { StatusPill, StudioPageHeader, StudioPanel, StudioRowLink, reviewWaitLabel } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export default function StudioDashboardPage() {
  const recent = studioWorks.slice(0, 3);
  const openTasks = studioTasks.filter((task) => !task.done).length;

  return (
    <>
      <StudioPageHeader
        eyebrow={`งวดปัจจุบัน · ${studioSummary.currentPeriod}`}
        title="ภาพรวม"
        description="ยอดของงวดนี้อัปเดตต่อเนื่องระหว่างเดือน ตัวเลขที่ใช้จ่ายจริงคือตัวเลขที่ล็อกตอนปิดงวดสิ้นเดือน"
        action={
          <ButtonLink href="/studio/works/new" variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            เพิ่มผลงานใหม่
          </ButtonLink>
        }
      />

      <DashboardStats isNewCreator={studioIsNewCreator} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <StudioPanel
          title="ผลงานล่าสุด"
          description="เรียงตามการแก้ไขล่าสุด"
          action={
            <Link
              href="/studio/works"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
            >
              ดูทั้งหมด
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {recent.map((work) => {
              const status = workStatusLabels[work.status];
              return (
                <li key={work.slug}>
                  <StudioRowLink href={`/studio/works/${work.slug}`}>
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid h-12 w-9 shrink-0 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary"
                      >
                        <BookMarked className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{work.title}</p>
                        <p className="mt-0.5 truncate text-xs text-(--text-tertiary)">
                          {work.status === "review"
                            ? reviewWaitLabel(studioReviewHours[work.slug])
                            : `${whole.format(work.chapters)} ตอน · แก้ไข ${work.updatedAt}`}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-sm font-semibold tabular-nums">{baht.format(work.earnings)}</p>
                        <p className="text-xs text-(--text-tertiary)">บาทงวดนี้</p>
                      </div>
                      <StatusPill label={status.label} dot={status.dot} />
                    </div>
                  </StudioRowLink>
                </li>
              );
            })}
          </ul>
        </StudioPanel>

        <div className="grid content-start gap-4">
          <section className="rounded-xl bg-accent-subtle p-5">
            <p className="text-xs font-semibold text-[var(--brand-emphasis)]">ยอดรอโอนงวดถัดไป</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{baht.format(studioSummary.pendingBalance)}</p>
            <p className="mt-1 text-xs text-(--text-secondary)">
              โอนภายใน {studioSummary.nextPayoutDate} · ขั้นต่ำ {whole.format(studioSummary.minimumPayout)} บาท
            </p>
            <ButtonLink href="/studio/payouts" variant="outline" className="mt-4 w-full">
              ดูรายละเอียดการจ่ายเงิน
            </ButtonLink>
          </section>

          <StudioPanel title="สิ่งที่ต้องทำ" description={`ค้างอยู่ ${openTasks} รายการ`}>
            <ul className="divide-y divide-border">
              {studioTasks.map((task) => (
                <li key={task.label}>
                  <StudioRowLink href={task.href}>
                    <div className="flex gap-3">
                      {task.done ? (
                        <CheckCircle2 aria-hidden className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
                      ) : (
                        <Circle aria-hidden className="mt-0.5 h-4.5 w-4.5 shrink-0 text-(--text-tertiary)" />
                      )}
                      <span
                        className={
                          task.done
                            ? "text-sm leading-6 text-(--text-tertiary) line-through"
                            : "text-sm leading-6 text-(--text-secondary)"
                        }
                      >
                        {task.label}
                      </span>
                    </div>
                  </StudioRowLink>
                </li>
              ))}
            </ul>
          </StudioPanel>
        </div>
      </div>
    </>
  );
}
