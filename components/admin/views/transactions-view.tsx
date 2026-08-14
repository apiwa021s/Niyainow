"use client";

import Link from "next/link";
import { Download, Receipt, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD, TRANSACTION_KIND, TRANSACTION_STATUS } from "@/lib/admin-labels";
import { getAdminTransactions, type TransactionQuery } from "@/services/admin-service";
import type { AdminTransaction, PaymentMethod, TransactionKind, TransactionStatus } from "@/types/admin";

export function TransactionsView({ initialQuery }: { initialQuery: TransactionQuery }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/transactions", {
    q: initialQuery.q,
    kind: initialQuery.kind,
    status: initialQuery.status,
    method: initialQuery.method
  });
  const [refundTarget, setRefundTarget] = useState<AdminTransaction | null>(null);

  const rows = useMemo(
    () =>
      getAdminTransactions({
        q: query.q,
        kind: query.kind as TransactionKind | "all" | undefined,
        status: query.status as TransactionStatus | "all" | undefined,
        method: query.method
      }),
    [query]
  );

  const columns: Column<AdminTransaction>[] = [
    {
      key: "reference",
      header: "อ้างอิง",
      cell: (tx) => (
        <div className="min-w-0">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{tx.reference}</code>
          <p className="mt-0.5 text-xs text-muted-foreground">{tx.createdAt}</p>
        </div>
      )
    },
    {
      key: "member",
      header: "สมาชิก",
      cell: (tx) => (
        <Link href={`/admin/users/${tx.memberId}`} prefetch className="block truncate text-sm font-medium hover:underline">
          {tx.memberName}
        </Link>
      )
    },
    {
      key: "kind",
      header: "ประเภท",
      cell: (tx) => <StatusPill label={TRANSACTION_KIND[tx.kind].label} tone={TRANSACTION_KIND[tx.kind].tone} />
    },
    {
      key: "coins",
      header: "เหรียญ",
      className: "tabular",
      cell: (tx) => `${tx.kind === "spend" ? "−" : "+"}${tx.coins.toLocaleString("th-TH")}`
    },
    {
      key: "amount",
      header: "จำนวนเงิน",
      className: "tabular font-semibold",
      cell: (tx) => (tx.amountTHB > 0 ? `${tx.amountTHB.toLocaleString("th-TH")} ฿` : "—")
    },
    {
      key: "method",
      header: "ช่องทาง",
      hideBelow: "lg",
      cell: (tx) => <span className="text-sm text-muted-foreground">{PAYMENT_METHOD[tx.method]}</span>
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (tx) => <StatusPill label={TRANSACTION_STATUS[tx.status].label} tone={TRANSACTION_STATUS[tx.status].tone} />
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (tx) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับธุรกรรม ${tx.reference}`}
            actions={[
              { label: "ดูบัญชีผู้ใช้", icon: <Receipt className="h-4 w-4" />, href: `/admin/users/${tx.memberId}` },
              {
                label: "ส่งใบเสร็จอีกครั้ง",
                icon: <Download className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `ส่งใบเสร็จของ ${tx.reference} ให้ ${tx.memberName} แล้ว` }),
                disabled: tx.status !== "success"
              },
              {
                label: "คืนเงินรายการนี้",
                icon: <RotateCcw className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => setRefundTarget(tx),
                disabled: tx.status !== "success" || tx.kind !== "topup"
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
        search={query.q ?? ""}
        onSearchChange={(value) => setQuery({ q: value || undefined })}
        searchPlaceholder="ค้นหาเลขอ้างอิงหรือชื่อสมาชิก…"
        filters={[
          {
            key: "kind",
            label: "ประเภท",
            value: query.kind ?? "all",
            options: allOption(
              (Object.keys(TRANSACTION_KIND) as TransactionKind[]).map((kind) => ({
                value: kind,
                label: TRANSACTION_KIND[kind].label
              }))
            ),
            onChange: (value) => setQuery({ kind: value })
          },
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(TRANSACTION_STATUS) as TransactionStatus[]).map((status) => ({
                value: status,
                label: TRANSACTION_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          },
          {
            key: "method",
            label: "ช่องทาง",
            value: query.method ?? "all",
            options: allOption(
              (Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((method) => ({
                value: method,
                label: PAYMENT_METHOD[method]
              }))
            ),
            onChange: (value) => setQuery({ method: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} ธุรกรรม`}
        actions={
          <Button variant="outline" onClick={() => toast({ tone: "success", message: "กำลังเตรียมไฟล์ CSV ให้ดาวน์โหลด" })}>
            <Download className="h-4 w-4" />
            ส่งออก CSV
          </Button>
        }
      />

      <DataTable
        caption="ตารางธุรกรรมทั้งหมด"
        rows={rows}
        columns={columns}
        getRowKey={(tx) => tx.id}
        pageSize={15}
        empty={
          <div className="text-center">
            <p className="text-sm font-semibold">ไม่พบธุรกรรมที่ตรงกับตัวกรองนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">ลองล้างตัวกรอง หรือเปลี่ยนช่วงประเภทที่เลือกไว้</p>
          </div>
        }
      />

      <ConfirmDialog
        open={Boolean(refundTarget)}
        onClose={() => setRefundTarget(null)}
        onConfirm={() => toast({ tone: "success", message: `เริ่มคืนเงิน ${refundTarget?.amountTHB.toLocaleString("th-TH")} บาทแล้ว` })}
        title={`คืนเงินรายการ ${refundTarget?.reference ?? ""}?`}
        description={`ระบบจะคืนเงิน ${refundTarget?.amountTHB.toLocaleString("th-TH") ?? 0} บาทผ่านช่องทางเดิม และหักเหรียญ ${refundTarget?.coins.toLocaleString("th-TH") ?? 0} เหรียญออกจากบัญชีผู้ใช้ ใช้เวลา 3–5 วันทำการ`}
        confirmLabel="ยืนยันคืนเงิน"
        tone="danger"
      />
    </div>
  );
}
