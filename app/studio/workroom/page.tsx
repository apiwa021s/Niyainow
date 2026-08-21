"use client";

import { AlertTriangle, Check, CircleAlert, Send, X } from "lucide-react";
import { useState } from "react";

import { whole } from "@/components/studio/mock-data";
import {
  workroomBottleneck,
  workroomCards,
  workroomPreflight,
  workroomStages,
  type WorkroomCard,
} from "@/components/studio/mock-workflow";
import { EmptyState, StudioPageHeader } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Columns3 } from "lucide-react";

const STUCK_AFTER_DAYS = 3;

function Avatar({ name }: { name: string }) {
  return (
    <span
      title={name}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-subtle text-[10px] font-bold text-[var(--brand-emphasis)]"
    >
      {name.slice(0, 1)}
    </span>
  );
}

function Card({ card, onSend }: { card: WorkroomCard; onSend?: () => void }) {
  const stuck = card.stuckDays >= STUCK_AFTER_DAYS;

  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-semibold leading-6">
        <span className="text-(--text-tertiary) tabular-nums">{card.number}</span> · {card.title}
      </p>
      <p className="mt-0.5 truncate text-xs text-(--text-tertiary)">{card.work}</p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Avatar name={card.owner} />
        <span className="text-xs tabular-nums text-(--text-secondary)">{whole.format(card.characters)} ตัวอักษร</span>
      </div>

      {stuck ? (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
          <CircleAlert aria-hidden className="h-3.5 w-3.5" />
          ค้าง {card.stuckDays} วัน
        </p>
      ) : null}

      {onSend ? (
        <Button type="button" variant="primary" size="sm" className="mt-3 w-full" onClick={onSend}>
          <Send aria-hidden className="h-3.5 w-3.5" />
          ส่งเข้าคิว
        </Button>
      ) : null}
    </article>
  );
}

export default function WorkroomPage() {
  const [preflightFor, setPreflightFor] = useState<WorkroomCard | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  const issues = workroomPreflight.glossaryIssues.filter((issue) => !skipped.includes(issue.id));
  const isEmpty = workroomStages.every((stage) => workroomCards[stage.key].length === 0);

  return (
    <>
      <StudioPageHeader
        eyebrow="WORKROOM"
        title="ห้องแปล"
        description="ทุกตอนที่กำลังทำอยู่ในที่เดียว ลากสายตาจากซ้ายไปขวาแล้วรู้ทันทีว่างานติดตรงไหน"
      />

      {/* The point of this page: not how much is done, but what is blocking release. */}
      {workroomBottleneck.releasableNow === 0 ? (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
          <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="font-semibold leading-7">
              ตอนที่ {workroomBottleneck.chapter} ค้างที่ “{workroomBottleneck.stage}” {workroomBottleneck.days} วัน — ทำให้ตอน{" "}
              {workroomBottleneck.blockedFrom}-{workroomBottleneck.blockedTo} ลงไม่ได้
            </p>
            <p className="mt-1 text-sm text-(--text-secondary)">
              คิวที่ลงได้จริง: <strong className="font-semibold text-(--text-primary)">{workroomBottleneck.releasableNow} ตอน</strong>{" "}
              (แปลไว้แล้ว {workroomBottleneck.translatedAhead} ตอน)
            </p>
          </div>
        </div>
      ) : null}

      {isEmpty ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={Columns3}
            title="ยังไม่มีตอนในห้องแปล"
            description="เพิ่มตอนแรกเข้ามา แล้วลากผ่านแต่ละขั้นเพื่อดูว่างานติดตรงไหน"
            action={
              <Button type="button" variant="primary">
                เพิ่มตอนเข้าห้องแปล
              </Button>
            }
          />
        </div>
      ) : (
        <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:px-5">
          <div className="flex min-w-max gap-3">
            {workroomStages.map((stage) => {
              const cards = workroomCards[stage.key];
              return (
                <section key={stage.key} className="w-64 shrink-0" aria-label={stage.label}>
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <h2 className="text-sm font-semibold">{stage.label}</h2>
                    <span className="text-xs tabular-nums text-(--text-tertiary)">{cards.length}</span>
                  </div>
                  <div className="grid gap-2 rounded-xl bg-muted/40 p-2">
                    {cards.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs leading-6 text-(--text-tertiary)">
                        ยังไม่มีตอนในขั้นนี้
                      </p>
                    ) : (
                      cards.map((card) => (
                        <Card
                          key={card.id}
                          card={card}
                          onSend={stage.key === "ready" ? () => setPreflightFor(card) : undefined}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {preflightFor ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreflightFor(null)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preflight-title"
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-(--bg-base) shadow-[var(--sh-3)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id="preflight-title" className="font-semibold">
                ตรวจก่อนส่งเข้าคิว
              </h2>
              <button
                type="button"
                onClick={() => setPreflightFor(null)}
                aria-label="ปิด"
                className="grid h-11 w-11 place-items-center rounded-(--r-md) hover:bg-muted"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="grid gap-3 p-5">
              <p className="flex items-center gap-2 text-sm text-(--text-secondary)">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
                ความยาว {whole.format(workroomPreflight.characters)} ตัวอักษร
              </p>

              {issues.length > 0 ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <CircleAlert aria-hidden className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    พบชื่อไม่ตรงคลังคำ {issues.length} จุด
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {issues.map((issue) => (
                      <li key={issue.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="text-(--text-secondary)">“{issue.found}”</span>
                          <span aria-hidden className="mx-1.5 text-(--text-tertiary)">→</span>
                          <span className="font-semibold">ควรเป็น “{issue.expected}”</span>
                        </span>
                        <span className="flex shrink-0 gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSkipped((current) => [...current, issue.id])}
                          >
                            แก้
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSkipped((current) => [...current, issue.id])}
                          >
                            ข้าม
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-(--text-secondary)">
                  <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
                  ชื่อเฉพาะตรงกับคลังคำทั้งหมด
                </p>
              )}

              <p className="flex items-center gap-2 text-sm text-(--text-secondary)">
                <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
                ไม่พบอักขระผิดปกติ
              </p>
            </div>

            <div className={cn("flex flex-wrap gap-3 border-t border-border px-5 py-4")}>
              <Button type="button" variant="primary" onClick={() => setPreflightFor(null)}>
                <Send aria-hidden className="h-4 w-4" />
                ส่งเข้าคิว
              </Button>
              <Button type="button" variant="outline" onClick={() => setPreflightFor(null)}>
                กลับไปแก้
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
