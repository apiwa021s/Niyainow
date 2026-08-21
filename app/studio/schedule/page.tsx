"use client";

import { CalendarDays, GripVertical, ListOrdered } from "lucide-react";
import { useState } from "react";

import { scheduleQueue, scheduleSummary } from "@/components/studio/mock-workflow";
import { EmptyState, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

/** Three bands, worded as a state of the queue — never as a judgement of the writer. */
function queueHealth(count: number) {
  if (count >= 7) return { label: "ปลอดภัย", bar: "bg-emerald-500", chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" };
  if (count >= 3) return { label: "ควรเติม", bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300" };
  return { label: "ใกล้หมด", bar: "bg-destructive", chip: "bg-destructive/12 text-destructive" };
}

export default function SchedulePage() {
  const [view, setView] = useState<"queue" | "calendar">("queue");
  const [queue, setQueue] = useState(scheduleQueue);
  const [showStockToReaders, setShowStockToReaders] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);

  const health = queueHealth(queue.length);
  const fill = Math.min(100, (queue.length / 14) * 100);

  function reorder(targetId: string) {
    if (!dragId || dragId === targetId) return;
    setQueue((current) => {
      const next = [...current];
      const from = next.findIndex((item) => item.id === dragId);
      const to = next.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <>
      <StudioPageHeader
        eyebrow="RELEASE SCHEDULE"
        title="ตารางลง"
        description="ดูว่าคิวที่ตุนไว้พอลงถึงเมื่อไหร่ และจัดลำดับใหม่ได้โดยไม่ต้องแก้ทีละตอน"
      />

      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1" role="tablist" aria-label="มุมมองตารางลง">
        {(
          [
            { key: "queue", label: "คิว", icon: ListOrdered },
            { key: "calendar", label: "ปฏิทิน", icon: CalendarDays },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = view === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setView(tab.key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
                active ? "bg-[var(--brand-primary)] text-white" : "text-(--text-secondary) hover:text-(--text-primary)",
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {queue.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState
            icon={CalendarDays}
            title="คิวยังว่างอยู่"
            description="พอมีตอนที่เขียนเสร็จแล้ว ส่งเข้าคิวจากห้องแปล แล้วหน้านี้จะบอกว่าลงได้ถึงวันไหน"
            action={
              <Button type="button" variant="primary">
                ไปที่ห้องแปล
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <section className="rounded-xl bg-accent-subtle p-5 sm:p-6">
            <p className="text-sm font-semibold text-[var(--brand-emphasis)]">คิวของคุณ: {queue.length} ตอน</p>
            <p className="mt-1 text-lg font-semibold">พอลงถึง {scheduleSummary.coversUntil} โดยไม่ต้องเขียนเพิ่ม</p>
            <div className="mt-3 flex items-center gap-3">
              <div aria-hidden className="h-2 flex-1 overflow-hidden rounded-full bg-(--bg-base)">
                <div className={cn("h-full rounded-full", health.bar)} style={{ width: `${fill}%` }} />
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", health.chip)}>{health.label}</span>
            </div>
          </section>

          {view === "queue" ? (
            <StudioPanel
              className="mt-4"
              title="ลำดับการปล่อยตอน"
              description="ลากเพื่อสลับลำดับ เวลาปล่อยจะไล่ตามลำดับใหม่ให้อัตโนมัติ"
            >
              <ul className="divide-y divide-border">
                {queue.map((item, index) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      reorder(item.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "flex cursor-grab items-center gap-3 px-5 py-3.5 active:cursor-grabbing",
                      dragId === item.id && "opacity-50",
                    )}
                  >
                    <GripVertical aria-hidden className="h-4 w-4 shrink-0 text-(--text-tertiary)" />
                    <span className="w-6 shrink-0 text-xs tabular-nums text-(--text-tertiary)">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="text-(--text-tertiary) tabular-nums">ตอนที่ {item.number}</span> · {item.title}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-(--text-secondary)">{item.releaseAt}</span>
                  </li>
                ))}
              </ul>
            </StudioPanel>
          ) : (
            <StudioPanel className="mt-4" title={scheduleSummary.monthLabel} description="จุดสีชมพูคือวันที่มีตอนปล่อย">
              <div className="p-5">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAYS.map((day) => (
                    <span key={day} className="pb-2 text-xs font-semibold text-(--text-tertiary)">
                      {day}
                    </span>
                  ))}
                  {Array.from({ length: scheduleSummary.firstWeekday }).map((_, index) => (
                    <span key={`pad-${index}`} aria-hidden />
                  ))}
                  {Array.from({ length: scheduleSummary.daysInMonth }).map((_, index) => {
                    const day = index + 1;
                    const hasRelease = scheduleSummary.releaseDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-label={
                          hasRelease ? `${day} ${scheduleSummary.monthLabel} มีตอนปล่อย` : `${day} ${scheduleSummary.monthLabel}`
                        }
                        className={cn(
                          "grid h-11 place-items-center rounded-(--r-md) text-sm tabular-nums transition-colors duration-[var(--dur-fast)] hover:bg-muted",
                          hasRelease ? "font-semibold" : "text-(--text-secondary)",
                        )}
                      >
                        {day}
                        {hasRelease ? <span aria-hidden className="mt-0.5 h-1 w-1 rounded-full bg-brand-primary" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </StudioPanel>
          )}

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold">แสดงให้คนอ่านเห็นว่ามีตอนตุนไว้กี่ตอน</span>
              <span className="mt-1 block text-xs leading-6 text-(--text-tertiary)">
                หน้าเรื่องจะขึ้นว่า “มีตอนรอปล่อยอีก {queue.length} ตอน” ช่วยให้คนกล้าเริ่มอ่านเรื่องยาว
              </span>
            </span>
            <input
              type="checkbox"
              checked={showStockToReaders}
              onChange={(event) => setShowStockToReaders(event.target.checked)}
              className="h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
            />
          </label>
        </>
      )}
    </>
  );
}
