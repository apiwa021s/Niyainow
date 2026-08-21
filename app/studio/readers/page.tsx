"use client";

import { CornerDownRight, MessagesSquare, Send, TrendingDown, UserPlus } from "lucide-react";
import { useState } from "react";

import { whole } from "@/components/studio/mock-data";
import {
  readerComments,
  readerCompletion,
  readerDropoff,
  readerFollowDrivers,
} from "@/components/studio/mock-workflow";
import { EmptyState, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";

/** Biggest single fall between two consecutive chapters — the place worth reading again. */
function steepestDrop() {
  let worst = { chapter: readerDropoff[0].chapter, drop: 0 };
  for (let i = 1; i < readerDropoff.length; i += 1) {
    const drop = readerDropoff[i - 1].retained - readerDropoff[i].retained;
    if (drop > worst.drop) worst = { chapter: readerDropoff[i].chapter, drop };
  }
  return worst;
}

export default function ReadersPage() {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const worst = steepestDrop();

  const maxFollows = Math.max(...readerFollowDrivers.map((item) => item.follows));

  return (
    <>
      <StudioPageHeader
        eyebrow="READERS"
        title="ผู้อ่าน"
        description="คนที่อ่านงานคุณคิดอะไร อ่านถึงไหน และตอนไหนที่ทำให้เขาตัดสินใจกดติดตาม"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="grid content-start gap-4">
          <StudioPanel title="คอมเมนต์ล่าสุด" description="ตอบได้จากตรงนี้เลย ไม่ต้องเปิดหน้าเรื่อง">
            {readerComments.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="ยังไม่มีคอมเมนต์"
                description="คอมเมนต์แรกมักมาหลังตอนที่ 3-5 ลองเขียนต่อให้ถึงจุดที่เรื่องเริ่มเข้าที่ก่อน"
              />
            ) : (
              <ul className="divide-y divide-border">
                {readerComments.map((comment) => (
                  <li key={comment.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold">{comment.reader}</span>
                      <span className="min-w-0 truncate text-xs text-(--text-tertiary)">
                        {comment.work} · {comment.chapter} · {comment.at}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">{comment.body}</p>

                    {sent.includes(comment.id) || comment.replied ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CornerDownRight aria-hidden className="h-3.5 w-3.5" />
                        ตอบแล้ว
                      </p>
                    ) : replyTo === comment.id ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Input autoFocus placeholder="พิมพ์คำตอบ…" className="min-w-0 flex-1" />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => {
                            setSent((current) => [...current, comment.id]);
                            setReplyTo(null);
                          }}
                        >
                          <Send aria-hidden className="h-4 w-4" />
                          ส่ง
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setReplyTo(null)}>
                          ยกเลิก
                        </Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setReplyTo(comment.id)}>
                        ตอบกลับ
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </StudioPanel>

          <StudioPanel
            title="จุดที่คนเลิกอ่าน"
            description="จากผู้อ่านที่เริ่มตอนแรก 100 คน เหลืออ่านต่อกี่คนในแต่ละตอน"
          >
            <div className="p-5">
              <div className="flex h-40 items-end gap-1.5">
                {readerDropoff.map((point) => (
                  <div key={point.chapter} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] tabular-nums text-(--text-tertiary)">{point.retained}</span>
                    <div
                      className={
                        point.chapter === worst.chapter
                          ? "w-full rounded-t bg-amber-500"
                          : "w-full rounded-t bg-brand-primary/70"
                      }
                      style={{ height: `${point.retained}%` }}
                    />
                    <span className="text-[10px] tabular-nums text-(--text-tertiary)">{point.chapter}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex gap-2 rounded-xl bg-muted/40 p-3 text-xs leading-6 text-(--text-secondary)">
                <TrendingDown aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                คนหายมากที่สุดที่ตอนที่ {worst.chapter} (−{worst.drop} คน) ลองอ่านช่วงต้นตอนนั้นอีกรอบ
                ส่วนใหญ่เป็นเพราะตอนก่อนหน้าจบแบบไม่ค้าง มากกว่าเพราะตอนนั้นไม่ดี
              </p>
            </div>
          </StudioPanel>
        </div>

        <div className="grid content-start gap-4">
          <StudioPanel title="อัตราอ่านจบตอน" description="เข้ามาอ่าน 100 คน อ่านถึงบรรทัดสุดท้ายกี่คน">
            <ul className="grid gap-4 p-5">
              {readerCompletion.map((row) => (
                <li key={row.work}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm">{row.work}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{row.rate}%</span>
                  </div>
                  <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${row.rate}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </StudioPanel>

          <StudioPanel title="ตอนที่ทำให้คนกดติดตาม" description="5 อันดับแรกจากทุกเรื่อง">
            <ul className="divide-y divide-border">
              {readerFollowDrivers.map((item) => (
                <li key={item.chapter} className="px-5 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-sm">{item.chapter}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
                      <UserPlus aria-hidden className="h-3.5 w-3.5 text-brand-primary" />
                      {whole.format(item.follows)}
                    </span>
                  </div>
                  <div aria-hidden className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-primary/70"
                      style={{ width: `${(item.follows / maxFollows) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </StudioPanel>
        </div>
      </div>
    </>
  );
}
