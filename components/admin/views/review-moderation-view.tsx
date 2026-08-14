"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, EyeOff, X } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/form-controls";
import type { AdminPage, AdminReviewQuery, AdminReviewRow, ReviewStatus } from "@/services/admin-service";

const statusMeta: Record<ReviewStatus, { label: string; tone: "neutral" | "warning" | "success" | "danger" }> = {
  PENDING: { label: "รอตรวจ", tone: "warning" },
  PUBLISHED: { label: "เผยแพร่", tone: "success" },
  HIDDEN: { label: "ซ่อน", tone: "neutral" },
  REJECTED: { label: "ไม่อนุมัติ", tone: "danger" },
};

function pageHref(query: AdminReviewQuery, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value && value !== "all") params.set(key, String(value));
  }
  return `/admin/comments?${params}`;
}

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  return (body?.error?.fields && Object.values(body.error.fields).flat()[0]) || body?.error?.message || `Request failed (${response.status})`;
}

export function ReviewModerationView({ result, query }: { result: AdminPage<AdminReviewRow>; query: AdminReviewQuery }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function moderate(review: AdminReviewRow, status: "PUBLISHED" | "REJECTED" | "HIDDEN") {
    setBusy(`${review.id}:${status}`);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          note: notes[review.id]?.trim() || null,
          expectedUpdatedAt: review.updatedAt,
        }),
      });
      if (response.status === 409) {
        setMessage("ผู้เขียนแก้ไขรีวิวหลังจากเปิดคิว ระบบโหลดฉบับล่าสุดแล้ว กรุณาตรวจใหม่ก่อนดำเนินการ");
        setNotes((current) => {
          const next = { ...current };
          delete next[review.id];
          return next;
        });
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error(await errorMessage(response));
      setMessage(`อัปเดตรีวิวเป็น “${statusMeta[status].label}” แล้ว`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถอัปเดตรีวิวได้");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Panel bodyClassName="p-4">
        <form action="/admin/comments" method="get" className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-56 flex-1 gap-1 text-xs font-medium text-muted-foreground">ค้นหา<Input name="q" defaultValue={query.q ?? ""} placeholder="ชื่อเรื่อง ผู้รีวิว อีเมล หรือหัวข้อ" /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">สถานะ<Select name="status" defaultValue={query.status ?? "PENDING"} className="min-w-40">
            <option value="all">ทั้งหมด</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </Select></label>
          <button className="h-11 rounded-[12px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
          <ButtonLink href="/admin/comments" variant="outline">คิวรอตรวจ</ButtonLink>
        </form>
      </Panel>

      {message ? <p role="status" className="rounded-[12px] border border-border bg-card px-4 py-3 text-sm">{message}</p> : null}

      <div className="grid gap-4">
        {result.items.map((review) => (
          <Panel
            key={review.id}
            title={review.title || `รีวิว ${review.novelTitle}`}
            description={`${review.authorName} · ${review.authorEmail} · ${new Date(review.createdAt).toLocaleString("th-TH")}`}
            action={<StatusPill {...statusMeta[review.status]} />}
          >
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link href={`/novel/${review.novelSlug}`} className="font-semibold text-[var(--brand-light-on-light)] hover:underline">{review.novelTitle}</Link>
                {review.isSpoiler ? <span className="rounded-[6px] bg-amber-500/10 px-2 py-1 font-semibold text-amber-700 dark:text-amber-300">มีสปอยล์</span> : null}
                <span>{review.likeCount.toLocaleString("th-TH")} ถูกใจ</span>
              </div>
              <p className="whitespace-pre-wrap rounded-[12px] bg-muted/50 p-4 text-sm leading-relaxed">{review.body}</p>
              {review.moderationNote ? <p className="text-xs text-muted-foreground">หมายเหตุเดิม: {review.moderationNote}</p> : null}
              <Textarea
                value={notes[review.id] ?? review.moderationNote ?? ""}
                onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.target.value.slice(0, 1_000) }))}
                maxLength={1_000}
                placeholder="หมายเหตุการตรวจ (ไม่บังคับ, สูงสุด 1,000 ตัวอักษร)"
                className="min-h-20"
                aria-label={`หมายเหตุสำหรับรีวิวของ ${review.authorName}`}
              />
              <div className="flex flex-wrap gap-2">
                {review.status !== "PUBLISHED" ? <Button type="button" size="sm" loading={busy === `${review.id}:PUBLISHED`} disabled={Boolean(busy)} onClick={() => void moderate(review, "PUBLISHED")}><Check className="h-4 w-4" />อนุมัติและเผยแพร่</Button> : null}
                {review.status !== "REJECTED" ? <Button type="button" size="sm" variant="danger" loading={busy === `${review.id}:REJECTED`} disabled={Boolean(busy)} onClick={() => void moderate(review, "REJECTED")}><X className="h-4 w-4" />ไม่อนุมัติ</Button> : null}
                {review.status !== "HIDDEN" ? <Button type="button" size="sm" variant="outline" loading={busy === `${review.id}:HIDDEN`} disabled={Boolean(busy)} onClick={() => void moderate(review, "HIDDEN")}><EyeOff className="h-4 w-4" />ซ่อน</Button> : null}
              </div>
            </div>
          </Panel>
        ))}
        {!result.items.length ? <Panel><p className="py-10 text-center text-sm text-muted-foreground">ไม่มีรีวิวในคิวนี้</p></Panel> : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>ทั้งหมด {result.total.toLocaleString("th-TH")} รีวิว</span><div className="flex items-center gap-2">
          {result.page > 1 ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page - 1)}>ก่อนหน้า</ButtonLink> : null}
          <span>หน้า {result.page} / {result.totalPages}</span>
          {result.page < result.totalPages ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page + 1)}>ถัดไป</ButtonLink> : null}
        </div>
      </div>
    </div>
  );
}
