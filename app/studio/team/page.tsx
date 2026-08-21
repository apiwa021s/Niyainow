"use client";

import { AlertTriangle, Check, Link2, Mail, UsersRound } from "lucide-react";
import { useState } from "react";

import { teamMembers } from "@/components/studio/mock-workflow";
import { EmptyState, StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

export default function TeamPage() {
  const [members, setMembers] = useState(teamMembers);
  const [inviteOpen, setInviteOpen] = useState(false);

  const total = members.reduce((sum, member) => sum + member.share, 0);
  const balanced = total === 100;

  function setShare(id: string, value: number) {
    setMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, share: Math.max(0, Math.min(100, value)) } : member)),
    );
  }

  return (
    <>
      <StudioPageHeader
        eyebrow="TEAM"
        title="ทีม"
        description="ใครทำอะไรในเรื่องไหน และรายได้แบ่งกันอย่างไร ตั้งไว้ครั้งเดียวแล้วระบบจัดการให้ทุกงวด"
        action={
          <Button type="button" variant="primary" onClick={() => setInviteOpen((value) => !value)}>
            <Mail aria-hidden className="h-4 w-4" />
            เชิญสมาชิก
          </Button>
        }
      />

      {inviteOpen ? (
        <div className="mb-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">เชิญเข้าทีม</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Input type="email" placeholder="อีเมลของเพื่อนร่วมทีม" className="min-w-0 flex-1" />
            <Button type="button" variant="primary">
              ส่งคำเชิญ
            </Button>
            <Button type="button" variant="outline">
              <Link2 aria-hidden className="h-4 w-4" />
              คัดลอกลิงก์เชิญ
            </Button>
          </div>
          <p className="mt-2 text-xs text-(--text-tertiary)">
            ลิงก์เชิญใช้ได้ 7 วัน คนที่กดเข้ามาจะเห็นเฉพาะเรื่องที่คุณมอบหมายให้เท่านั้น
          </p>
        </div>
      ) : null}

      {!balanced ? (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle aria-hidden className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm leading-7 text-(--text-secondary)">
            สัดส่วนรวมกันได้ <strong className="font-semibold text-(--text-primary) tabular-nums">{total}%</strong>{" "}
            {total < 100 ? `ยังขาดอีก ${100 - total}%` : `เกินมา ${total - 100}%`} — ปรับให้ครบ 100% ก่อนถึงรอบจ่ายเงิน
            มิฉะนั้นระบบจะใช้สัดส่วนเดิมของงวดก่อน
          </p>
        </div>
      ) : (
        <p className="mb-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium">
          <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
          สัดส่วนรวมครบ 100% พร้อมใช้ในรอบจ่ายเงินถัดไป
        </p>
      )}

      <StudioPanel title="สมาชิกในทีม" description={`${members.length} คน`}>
        {members.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="ยังทำงานคนเดียวอยู่"
            description="ถ้าวันหนึ่งมีคนช่วยตรวจหรือช่วยเกลา เชิญเข้ามาแล้วตั้งสัดส่วนไว้ ระบบจะโอนให้แต่ละคนเองทุกงวด"
            action={
              <Button type="button" variant="primary" onClick={() => setInviteOpen(true)}>
                เชิญคนแรกเข้าทีม
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
                  <th scope="col" className="px-5 py-3 font-medium">ชื่อ</th>
                  <th scope="col" className="px-5 py-3 font-medium">บทบาท</th>
                  <th scope="col" className="px-5 py-3 font-medium">เรื่องที่ดูแล</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">สัดส่วนส่วนแบ่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id} className="transition-colors duration-[var(--dur-fast)] hover:bg-muted/50">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-subtle text-xs font-bold text-[var(--brand-emphasis)]"
                        >
                          {member.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 truncate font-medium">{member.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-(--text-secondary)">{member.role}</td>
                    <td className="px-5 py-3.5 text-(--text-secondary)">{member.works}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center justify-end gap-2">
                        <label className="sr-only" htmlFor={`share-${member.id}`}>
                          สัดส่วนของ {member.name}
                        </label>
                        <input
                          id={`share-${member.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={member.share}
                          onChange={(event) => setShare(member.id, Number(event.target.value))}
                          className="h-11 w-20 rounded-[6px] border border-border bg-card px-3 text-right text-sm tabular-nums hover:border-[var(--brand-emphasis)]"
                        />
                        <span className="text-(--text-tertiary)">%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40 font-semibold">
                  <td className="px-5 py-3.5" colSpan={3}>
                    รวม
                  </td>
                  <td className={cn("px-5 py-3.5 text-right tabular-nums", !balanced && "text-amber-600 dark:text-amber-400")}>
                    {total}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="border-t border-border px-5 py-4 text-xs leading-6 text-(--text-tertiary)">
          ระบบจะโอนแยกให้แต่ละคนโดยตรงตามสัดส่วนนี้ ไม่ต้องมีใครรับเงินก้อนแล้วไปแบ่งกันเอง
        </p>
      </StudioPanel>
    </>
  );
}
