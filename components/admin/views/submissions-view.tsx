"use client";

import Image from "next/image";
import { Check, Clock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/section";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { staffMembers } from "@/data/admin-data";
import { genres } from "@/data/mock-data";
import { getSubmissions } from "@/services/admin-service";
import type { NovelSubmission } from "@/types/admin";

const STATUS_TABS = [
  { value: "pending", label: "รออนุมัติ" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธแล้ว" },
  { value: "all", label: "ทั้งหมด" }
];

const SUBMISSION_STATUS = {
  pending: { label: "รออนุมัติ", tone: "warning" as const },
  approved: { label: "อนุมัติแล้ว", tone: "success" as const },
  rejected: { label: "ปฏิเสธแล้ว", tone: "danger" as const }
};

export function SubmissionsView({ initialStatus }: { initialStatus?: string }) {
  const { toast } = useToast();
  const { query, setQuery } = useAdminQuery("/admin/submissions", { status: initialStatus ?? "pending" });
  const [approving, setApproving] = useState<NovelSubmission | null>(null);
  const [rejecting, setRejecting] = useState<NovelSubmission | null>(null);
  const [reason, setReason] = useState("");
  const [assignee, setAssignee] = useState(staffMembers[2].name);

  const rows = useMemo(() => getSubmissions(query.status), [query.status]);

  return (
    <div className="flex flex-col gap-4">
      {/* แท็บสถานะ — เห็นคิวที่ค้างอยู่ก่อนเสมอ */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองตามสถานะ">
        {STATUS_TABS.map((tab) => {
          const active = (query.status ?? "pending") === tab.value;
          const count = getSubmissions(tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setQuery({ status: tab.value })}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              {tab.label}
              <span className="tabular text-xs text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="ไม่มีเรื่องในคิวนี้"
          description="เมื่อทีมแปลส่งเรื่องใหม่เข้ามา จะมาโผล่ที่นี่พร้อมตัวอย่างตอนแรก"
          icon={<Clock className="h-6 w-6" />}
        />
      ) : (
        <ul className="grid gap-4">
          {rows.map((submission) => (
            <li key={submission.id}>
              <article className="grid gap-4 rounded-[16px] border border-border bg-card p-4 shadow-[var(--sh-1)] sm:grid-cols-[112px_minmax(0,1fr)]">
                <Image
                  src={submission.cover}
                  alt=""
                  width={112}
                  height={168}
                  className="h-42 w-28 rounded-[12px] object-cover"
                  sizes="112px"
                />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold">{submission.thaiTitle}</h2>
                      <p className="text-sm text-muted-foreground">
                        {submission.title} · {submission.author}
                      </p>
                    </div>
                    <StatusPill
                      label={SUBMISSION_STATUS[submission.status].label}
                      tone={SUBMISSION_STATUS[submission.status].tone}
                    />
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{submission.synopsis}</p>

                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {submission.genres.map((slug) => (
                      <li key={slug}>
                        <span className="rounded-[8px] bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          {genres.find((genre) => genre.slug === slug)?.thaiName ?? slug}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>ส่งโดย</dt>
                      <dd className="font-semibold text-foreground">{submission.submittedBy}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>ตอนที่ส่งมา</dt>
                      <dd className="tabular font-semibold text-foreground">{submission.chapters} ตอน</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>เมื่อ</dt>
                      <dd className="font-semibold text-foreground">{submission.submittedAt}</dd>
                    </div>
                  </dl>

                  {submission.note ? (
                    <p className="mt-3 rounded-[10px] border border-destructive/25 bg-destructive/5 p-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-destructive">เหตุผลที่ปฏิเสธ: </span>
                      {submission.note}
                    </p>
                  ) : null}

                  {submission.status === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setApproving(submission)}>
                        <Check className="h-4 w-4" />
                        อนุมัติและเผยแพร่
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => {
                          setRejecting(submission);
                          setReason("");
                        }}
                      >
                        <X className="h-4 w-4" />
                        ปฏิเสธ
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      {/* อนุมัติ + มอบหมายบรรณาธิการ */}
      <Modal
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        title={`อนุมัติ ${approving?.thaiTitle ?? ""}`}
        description="เรื่องจะถูกสร้างเป็นฉบับร่างในระบบ พร้อมมอบหมายให้บรรณาธิการตรวจก่อนเผยแพร่จริง"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setApproving(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast({ tone: "success", message: `อนุมัติ ${approving?.thaiTitle} และมอบหมายให้ ${assignee} แล้ว` });
                setApproving(null);
              }}
            >
              อนุมัติ
            </Button>
          </>
        }
      >
        <Field label="มอบหมายให้">
          <Select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
            {staffMembers
              .filter((staff) => staff.status === "active")
              .map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
          </Select>
        </Field>
      </Modal>

      {/* ปฏิเสธ — ต้องกรอกเหตุผลเสมอ เพื่อให้ทีมแปลรู้ว่าต้องแก้อะไร */}
      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={`ปฏิเสธ ${rejecting?.thaiTitle ?? ""}`}
        description="เหตุผลจะถูกส่งให้ผู้ส่งทางอีเมล กรุณาระบุให้ชัดเจนว่าต้องแก้อะไรบ้าง"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              disabled={reason.trim().length < 10}
              onClick={() => {
                toast({ tone: "info", message: `ปฏิเสธ ${rejecting?.thaiTitle} และส่งเหตุผลให้ผู้ส่งแล้ว` });
                setRejecting(null);
              }}
            >
              ปฏิเสธเรื่องนี้
            </Button>
          </>
        }
      >
        <Field
          label="เหตุผล"
          hint="อย่างน้อย 10 ตัวอักษร"
          error={reason.length > 0 && reason.trim().length < 10 ? "เหตุผลสั้นเกินไป" : undefined}
        >
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="เช่น ตัวอย่าง 5 ตอนแรกยังมีคำผิดจำนวนมาก แนะนำให้พิสูจน์อักษรก่อนส่งใหม่"
          />
        </Field>
      </Modal>
    </div>
  );
}
