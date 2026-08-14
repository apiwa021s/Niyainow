"use client";

import Link from "next/link";
import { Ban, Coins, KeyRound, Mail, ShieldOff, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { MEMBER_ROLE, MEMBER_STATUS } from "@/lib/admin-labels";
import { getMembers, type MemberQuery } from "@/services/admin-service";
import type { Member, MemberRole, MemberStatus } from "@/types/admin";

const SORT_OPTIONS = [
  { value: "recent", label: "เข้าใช้ล่าสุด" },
  { value: "spent", label: "ยอดใช้จ่ายสูงสุด" },
  { value: "read", label: "อ่านมากที่สุด" },
  { value: "name", label: "ชื่อ ก–ฮ" }
];

export function UsersView({ initialQuery }: { initialQuery: MemberQuery }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/users", {
    q: initialQuery.q,
    status: initialQuery.status,
    role: initialQuery.role,
    sort: initialQuery.sort ?? "recent"
  });

  const [coinTarget, setCoinTarget] = useState<Member | null>(null);
  const [coinAmount, setCoinAmount] = useState("50");
  const [coinNote, setCoinNote] = useState("");
  const [banTarget, setBanTarget] = useState<Member | null>(null);

  const rows = useMemo(
    () =>
      getMembers({
        q: query.q,
        status: query.status as MemberStatus | "all" | undefined,
        role: query.role as MemberRole | "all" | undefined,
        sort: query.sort as MemberQuery["sort"]
      }),
    [query]
  );

  const columns: Column<Member>[] = [
    {
      key: "user",
      header: "ผู้ใช้",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
          >
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <Link href={`/admin/users/${member.id}`} prefetch className="block truncate font-semibold hover:underline">
              {member.displayName}
            </Link>
            <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
          </div>
        </div>
      )
    },
    {
      key: "email",
      header: "อีเมล",
      hideBelow: "lg",
      cell: (member) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{member.email}</p>
          {!member.verified ? <p className="text-xs text-amber-600 dark:text-amber-400">ยังไม่ยืนยันอีเมล</p> : null}
        </div>
      )
    },
    {
      key: "role",
      header: "บทบาท",
      hideBelow: "md",
      cell: (member) => <StatusPill label={MEMBER_ROLE[member.role].label} tone={MEMBER_ROLE[member.role].tone} />
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (member) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={MEMBER_STATUS[member.status].label} tone={MEMBER_STATUS[member.status].tone} />
          {member.reports > 0 ? <span className="text-xs text-destructive">ถูกรายงาน {member.reports} ครั้ง</span> : null}
        </div>
      )
    },
    {
      key: "coins",
      header: "เหรียญ",
      hideBelow: "md",
      className: "tabular",
      cell: (member) => member.coins.toLocaleString("th-TH")
    },
    {
      key: "spent",
      header: "ใช้จ่ายสะสม",
      hideBelow: "xl",
      className: "tabular",
      cell: (member) => `${member.spentTHB.toLocaleString("th-TH")} ฿`
    },
    {
      key: "lastActive",
      header: "เข้าใช้ล่าสุด",
      hideBelow: "xl",
      cell: (member) => <span className="whitespace-nowrap text-xs text-muted-foreground">{member.lastActive}</span>
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (member) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับ ${member.displayName}`}
            actions={[
              { label: "ดูรายละเอียดผู้ใช้", icon: <UserRound className="h-4 w-4" />, href: `/admin/users/${member.id}` },
              {
                label: "เพิ่ม/หักเหรียญ",
                icon: <Coins className="h-4 w-4" />,
                onSelect: () => {
                  setCoinTarget(member);
                  setCoinAmount("50");
                  setCoinNote("");
                }
              },
              {
                label: "ส่งลิงก์รีเซ็ตรหัสผ่าน",
                icon: <KeyRound className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `ส่งลิงก์รีเซ็ตรหัสผ่านไปที่ ${member.email} แล้ว` })
              },
              {
                label: "ระงับบัญชี 7 วัน",
                icon: <ShieldOff className="h-4 w-4" />,
                onSelect: () => toast({ tone: "info", message: `ระงับบัญชี ${member.displayName} เป็นเวลา 7 วันแล้ว` })
              },
              { label: "แบนถาวร", icon: <Ban className="h-4 w-4" />, tone: "danger", onSelect: () => setBanTarget(member) }
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        search={query.q ?? ""}
        onSearchChange={(value) => setQuery({ q: value || undefined })}
        searchPlaceholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้…"
        filters={[
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(MEMBER_STATUS) as MemberStatus[]).map((status) => ({
                value: status,
                label: MEMBER_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          },
          {
            key: "role",
            label: "บทบาท",
            value: query.role ?? "all",
            options: allOption(
              (Object.keys(MEMBER_ROLE) as MemberRole[]).map((role) => ({ value: role, label: MEMBER_ROLE[role].label }))
            ),
            onChange: (value) => setQuery({ role: value })
          },
          {
            key: "sort",
            label: "เรียงตาม",
            value: query.sort ?? "recent",
            options: SORT_OPTIONS,
            onChange: (value) => setQuery({ sort: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} บัญชี`}
      />

      <DataTable
        caption="ตารางสมาชิกทั้งหมด"
        rows={rows}
        columns={columns}
        getRowKey={(member) => member.id}
        selectable
        pageSize={15}
        bulkActions={[
          {
            label: "ส่งอีเมลถึงผู้ที่เลือก",
            icon: <Mail className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "success", message: `เตรียมส่งอีเมลถึง ${ids.length} บัญชีแล้ว` })
          },
          {
            label: "ระงับชั่วคราว",
            icon: <ShieldOff className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "info", message: `ระงับ ${ids.length} บัญชีเป็นเวลา 7 วัน` })
          },
          {
            label: "แบนถาวร",
            icon: <Ban className="h-3.5 w-3.5" />,
            tone: "danger",
            onRun: (ids) => toast({ tone: "error", message: `แบน ${ids.length} บัญชีถาวรแล้ว` })
          }
        ]}
      />

      {/* ปรับเหรียญ — ใช้ตอนคืนเหรียญให้ผู้ใช้ที่เจอปัญหา */}
      <Modal
        open={Boolean(coinTarget)}
        onClose={() => setCoinTarget(null)}
        title={`ปรับเหรียญของ ${coinTarget?.displayName ?? ""}`}
        description={`ยอดปัจจุบัน ${coinTarget?.coins.toLocaleString("th-TH") ?? 0} เหรียญ — ใส่ค่าติดลบเพื่อหักเหรียญ`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCoinTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              disabled={coinNote.trim().length < 4}
              onClick={() => {
                toast({ tone: "success", message: `ปรับเหรียญของ ${coinTarget?.displayName} จำนวน ${coinAmount} เหรียญแล้ว` });
                setCoinTarget(null);
              }}
            >
              บันทึกการปรับ
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="จำนวนเหรียญ">
            <Input
              type="number"
              value={coinAmount}
              onChange={(event) => setCoinAmount(event.target.value)}
              className="tabular"
            />
          </Field>
          <Field label="เหตุผล" hint="บันทึกไว้ในประวัติเพื่อให้ตรวจย้อนหลังได้ (อย่างน้อย 4 ตัวอักษร)">
            <Textarea
              value={coinNote}
              onChange={(event) => setCoinNote(event.target.value)}
              placeholder="เช่น คืนเหรียญกรณีตอนที่ 88 เปิดไม่ได้"
              className="min-h-20"
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(banTarget)}
        onClose={() => setBanTarget(null)}
        onConfirm={() => toast({ tone: "error", message: `แบน ${banTarget?.displayName} ถาวรแล้ว` })}
        title={`แบน ${banTarget?.displayName ?? ""} ถาวร?`}
        description="ผู้ใช้จะเข้าสู่ระบบไม่ได้อีก คอมเมนต์ทั้งหมดจะถูกซ่อน และเหรียญคงเหลือจะถูกระงับไว้จนกว่าจะมีการทบทวน"
        confirmLabel="แบนถาวร"
        tone="danger"
      />
    </div>
  );
}
