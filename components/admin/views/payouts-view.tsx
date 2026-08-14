"use client";

import { BadgeCheck, Banknote, FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { useToast } from "@/components/ui/toast";
import { PAYOUT_STATUS } from "@/lib/admin-labels";
import { getPayouts } from "@/services/admin-service";
import type { AdminPayout, PayoutStatus } from "@/types/admin";

export function PayoutsView({ initialStatus }: { initialStatus?: string }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/payouts", { status: initialStatus });
  const [approving, setApproving] = useState<AdminPayout | null>(null);
  const [rejecting, setRejecting] = useState<AdminPayout | null>(null);

  const rows = useMemo(() => getPayouts(query.status), [query.status]);

  const columns: Column<AdminPayout>[] = [
    {
      key: "team",
      header: "ทีมแปล",
      cell: (payout) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{payout.team}</p>
          <p className="truncate text-xs text-muted-foreground">{payout.contact}</p>
        </div>
      )
    },
    {
      key: "period",
      header: "รอบ",
      cell: (payout) => <span className="whitespace-nowrap text-sm">{payout.periodLabel}</span>
    },
    {
      key: "coins",
      header: "เหรียญที่แลก",
      hideBelow: "md",
      className: "tabular",
      cell: (payout) => payout.coins.toLocaleString("th-TH")
    },
    {
      key: "amount",
      header: "จำนวนเงิน",
      className: "tabular font-semibold",
      cell: (payout) => `${payout.amountTHB.toLocaleString("th-TH")} ฿`
    },
    {
      key: "bank",
      header: "บัญชีรับเงิน",
      hideBelow: "lg",
      cell: (payout) => <span className="text-sm text-muted-foreground">{payout.bankMasked}</span>
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (payout) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={PAYOUT_STATUS[payout.status].label} tone={PAYOUT_STATUS[payout.status].tone} />
          <span className="text-xs text-muted-foreground">{payout.requestedAt}</span>
        </div>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (payout) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับคำขอของ ${payout.team}`}
            actions={[
              {
                label: "อนุมัติคำขอ",
                icon: <BadgeCheck className="h-4 w-4" />,
                onSelect: () => setApproving(payout),
                disabled: payout.status !== "pending"
              },
              {
                label: "ทำเครื่องหมายว่าโอนแล้ว",
                icon: <Banknote className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `บันทึกการโอนให้ ${payout.team} แล้ว` }),
                disabled: payout.status !== "approved"
              },
              {
                label: "ดูรายงานรายได้",
                icon: <FileText className="h-4 w-4" />,
                onSelect: () => toast({ tone: "info", message: `กำลังเตรียมรายงานรอบ ${payout.periodLabel} ของ ${payout.team}` })
              },
              {
                label: "ปฏิเสธคำขอ",
                icon: <X className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => setRejecting(payout),
                disabled: payout.status === "paid"
              }
            ]}
          />
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        filters={[
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(PAYOUT_STATUS) as PayoutStatus[]).map((status) => ({
                value: status,
                label: PAYOUT_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} คำขอ`}
      />

      <DataTable caption="ตารางคำขอถอนรายได้ของทีมแปล" rows={rows} columns={columns} getRowKey={(payout) => payout.id} />

      <ConfirmDialog
        open={Boolean(approving)}
        onClose={() => setApproving(null)}
        onConfirm={() => toast({ tone: "success", message: `อนุมัติคำขอของ ${approving?.team} แล้ว รอทีมบัญชีโอนเงิน` })}
        title={`อนุมัติจ่าย ${approving?.amountTHB.toLocaleString("th-TH") ?? 0} บาท?`}
        description={`${approving?.team ?? ""} รอบ ${approving?.periodLabel ?? ""} — เมื่ออนุมัติแล้วยอดจะถูกส่งเข้าคิวโอนของทีมบัญชี และแก้ไขจำนวนไม่ได้อีก`}
        confirmLabel="อนุมัติคำขอ"
      />

      <ConfirmDialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        onConfirm={() => toast({ tone: "info", message: `ปฏิเสธคำขอของ ${rejecting?.team} และแจ้งทีมแปลแล้ว` })}
        title={`ปฏิเสธคำขอของ ${rejecting?.team ?? ""}?`}
        description="ระบบจะแจ้งทีมแปลทางอีเมล และคืนยอดเหรียญกลับเข้ากระเป๋ารายได้ของทีมเพื่อขอถอนใหม่ในรอบถัดไป"
        confirmLabel="ปฏิเสธคำขอ"
        tone="danger"
      />
    </div>
  );
}
