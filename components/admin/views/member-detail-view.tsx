"use client";

import Link from "next/link";
import { Ban, Coins, KeyRound, ShieldOff, UserRound } from "lucide-react";
import { useState } from "react";
import { DetailRow, Panel, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { MEMBER_ROLE, MEMBER_STATUS, PAYMENT_METHOD, TRANSACTION_KIND, TRANSACTION_STATUS, COMMENT_STATUS } from "@/lib/admin-labels";
import type { AdminComment, AdminTransaction, Member } from "@/types/admin";

export function MemberDetailView({
  member,
  transactions,
  comments
}: {
  member: Member;
  transactions: AdminTransaction[];
  comments: AdminComment[];
}) {
  const { toast } = useToast();
  const [coinOpen, setCoinOpen] = useState(false);
  const [coinAmount, setCoinAmount] = useState("50");
  const [coinNote, setCoinNote] = useState("");
  const [banOpen, setBanOpen] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="เหรียญคงเหลือ" value={member.coins} unit="เหรียญ" />
          <StatCard label="ใช้จ่ายสะสม" value={member.spentTHB} unit="บาท" />
          <StatCard label="ตอนที่อ่านแล้ว" value={member.chaptersRead} unit="ตอน" />
          <StatCard label="เรื่องที่ติดตาม" value={member.follows} unit="เรื่อง" />
        </div>

        <Panel title="ธุรกรรมล่าสุด" description="เฉพาะ 8 รายการหลังสุดของบัญชีนี้" bodyClassName="p-0">
          {transactions.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">บัญชีนี้ยังไม่มีธุรกรรม</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {TRANSACTION_KIND[tx.kind].label} · {tx.coins.toLocaleString("th-TH")} เหรียญ
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {tx.reference} · {PAYMENT_METHOD[tx.method]} · {tx.createdAt}
                    </p>
                  </div>
                  <span className="tabular text-sm font-semibold">
                    {tx.amountTHB > 0 ? `${tx.amountTHB.toLocaleString("th-TH")} ฿` : "—"}
                  </span>
                  <StatusPill label={TRANSACTION_STATUS[tx.status].label} tone={TRANSACTION_STATUS[tx.status].tone} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="คอมเมนต์ล่าสุด"
          description="ใช้ประเมินพฤติกรรมก่อนตัดสินใจระงับบัญชี"
          action={
            <Link href="/admin/comments" prefetch className="text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">
              ไปหน้าคอมเมนต์
            </Link>
          }
          bodyClassName="p-0"
        >
          {comments.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">บัญชีนี้ยังไม่เคยคอมเมนต์</p>
          ) : (
            <ul className="divide-y divide-border">
              {comments.map((comment) => (
                <li key={comment.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{comment.novelTitle}</span>
                    <span className="text-xs text-muted-foreground">ตอนที่ {comment.chapter}</span>
                    <StatusPill
                      className="ml-auto"
                      label={COMMENT_STATUS[comment.status].label}
                      tone={COMMENT_STATUS[comment.status].tone}
                    />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* ---------------- คอลัมน์ขวา: ข้อมูลบัญชี + คำสั่ง ---------------- */}
      <div className="grid content-start gap-4">
        <Panel title="ข้อมูลบัญชี">
          <div className="mb-4 flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[image:var(--grad-primary)] text-white"
            >
              <UserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{member.displayName}</p>
              <p className="truncate text-sm text-muted-foreground">@{member.username}</p>
            </div>
          </div>

          <dl>
            <DetailRow label="รหัสผู้ใช้">
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{member.id}</code>
            </DetailRow>
            <DetailRow label="อีเมล">{member.email}</DetailRow>
            <DetailRow label="ยืนยันอีเมล">{member.verified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}</DetailRow>
            <DetailRow label="บทบาท">
              <StatusPill label={MEMBER_ROLE[member.role].label} tone={MEMBER_ROLE[member.role].tone} />
            </DetailRow>
            <DetailRow label="สถานะ">
              <StatusPill label={MEMBER_STATUS[member.status].label} tone={MEMBER_STATUS[member.status].tone} />
            </DetailRow>
            <DetailRow label="สมัครเมื่อ">{member.joinedAt}</DetailRow>
            <DetailRow label="เข้าใช้ล่าสุด">{member.lastActive}</DetailRow>
            <DetailRow label="ถูกรายงาน">{member.reports.toLocaleString("th-TH")} ครั้ง</DetailRow>
          </dl>
        </Panel>

        <Panel title="คำสั่งจัดการ" description="ทุกคำสั่งถูกบันทึกลงบันทึกกิจกรรม">
          <div className="grid gap-2">
            <Button onClick={() => setCoinOpen(true)}>
              <Coins className="h-4 w-4" />
              เพิ่ม/หักเหรียญ
            </Button>
            <Button
              variant="outline"
              onClick={() => toast({ tone: "success", message: `ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${member.email} แล้ว` })}
            >
              <KeyRound className="h-4 w-4" />
              ส่งลิงก์รีเซ็ตรหัสผ่าน
            </Button>
            <Button
              variant="outline"
              onClick={() => toast({ tone: "info", message: `ระงับบัญชี ${member.displayName} เป็นเวลา 7 วันแล้ว` })}
            >
              <ShieldOff className="h-4 w-4" />
              ระงับบัญชี 7 วัน
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => setBanOpen(true)}>
              <Ban className="h-4 w-4" />
              แบนถาวร
            </Button>
          </div>
        </Panel>
      </div>

      <Modal
        open={coinOpen}
        onClose={() => setCoinOpen(false)}
        title={`ปรับเหรียญของ ${member.displayName}`}
        description={`ยอดปัจจุบัน ${member.coins.toLocaleString("th-TH")} เหรียญ — ใส่ค่าติดลบเพื่อหักเหรียญ`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCoinOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              disabled={coinNote.trim().length < 4}
              onClick={() => {
                toast({ tone: "success", message: `ปรับเหรียญจำนวน ${coinAmount} เหรียญให้ ${member.displayName} แล้ว` });
                setCoinOpen(false);
              }}
            >
              บันทึกการปรับ
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="จำนวนเหรียญ">
            <Input type="number" value={coinAmount} onChange={(event) => setCoinAmount(event.target.value)} className="tabular" />
          </Field>
          <Field label="เหตุผล" hint="อย่างน้อย 4 ตัวอักษร">
            <Textarea value={coinNote} onChange={(event) => setCoinNote(event.target.value)} className="min-h-20" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={banOpen}
        onClose={() => setBanOpen(false)}
        onConfirm={() => toast({ tone: "error", message: `แบน ${member.displayName} ถาวรแล้ว` })}
        title={`แบน ${member.displayName} ถาวร?`}
        description="ผู้ใช้จะเข้าสู่ระบบไม่ได้อีก คอมเมนต์ทั้งหมดจะถูกซ่อน และเหรียญคงเหลือจะถูกระงับไว้จนกว่าจะมีการทบทวน"
        confirmLabel="แบนถาวร"
        tone="danger"
      />
    </div>
  );
}
