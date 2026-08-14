"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, ShieldCheck, X } from "lucide-react";
import { useMemo } from "react";
import { FilterBar, allOption } from "@/components/admin/admin-table";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/section";
import { useToast } from "@/components/ui/toast";
import { REPORT_PRIORITY, REPORT_REASON, REPORT_STATUS, REPORT_TARGET } from "@/lib/admin-labels";
import { getAdminReports } from "@/services/admin-service";
import type { ReportReason, ReportStatus } from "@/types/admin";

export function ReportsView({ initialQuery }: { initialQuery: { status?: string; q?: string; reason?: string } }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/reports", {
    q: initialQuery.q,
    status: initialQuery.status,
    reason: initialQuery.reason
  });

  const rows = useMemo(() => {
    const list = getAdminReports(query.status, query.q);
    return query.reason && query.reason !== "all" ? list.filter((report) => report.reason === query.reason) : list;
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar
        search={query.q ?? ""}
        onSearchChange={(value) => setQuery({ q: value || undefined })}
        searchPlaceholder="ค้นหาเนื้อหาที่ถูกรายงาน หรือชื่อผู้รายงาน…"
        filters={[
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(REPORT_STATUS) as ReportStatus[]).map((status) => ({
                value: status,
                label: REPORT_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          },
          {
            key: "reason",
            label: "เหตุผล",
            value: query.reason ?? "all",
            options: allOption(
              (Object.keys(REPORT_REASON) as ReportReason[]).map((reason) => ({
                value: reason,
                label: REPORT_REASON[reason].label
              }))
            ),
            onChange: (value) => setQuery({ reason: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} รายงาน`}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="ไม่มีรายงานในคิวนี้"
          description="เมื่อผู้อ่านกดรายงานเนื้อหา รายการจะมาโผล่ที่นี่พร้อมลิงก์ไปยังจุดที่ถูกรายงาน"
          icon={<ShieldCheck className="h-6 w-6" />}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((report) => (
            <li key={report.id}>
              <article className="rounded-[16px] border border-border bg-card p-4 shadow-[var(--sh-1)]">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={REPORT_PRIORITY[report.priority].label} tone={REPORT_PRIORITY[report.priority].tone} />
                  <StatusPill label={REPORT_REASON[report.reason].label} tone={REPORT_REASON[report.reason].tone} />
                  <span className="text-xs text-muted-foreground">{REPORT_TARGET[report.targetType]}</span>
                  <StatusPill
                    className="ml-auto"
                    label={REPORT_STATUS[report.status].label}
                    tone={REPORT_STATUS[report.status].tone}
                  />
                </div>

                <h2 className="mt-2 text-sm font-semibold">{report.targetLabel}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{report.detail}</p>

                <p className="mt-2 text-xs text-muted-foreground">
                  รายงานโดย <span className="font-semibold text-foreground">{report.reporter}</span> · {report.createdAt} ·
                  รหัส {report.id}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={report.targetHref}
                    prefetch
                    className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-border px-3 text-xs font-semibold hover:bg-muted"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    ดูเนื้อหาที่ถูกรายงาน
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  {report.status === "open" || report.status === "reviewing" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => toast({ tone: "success", message: `ปิดรายงาน ${report.id} เรียบร้อย` })}
                      >
                        <Check className="h-4 w-4" />
                        จัดการแล้ว
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast({ tone: "info", message: `ทำเครื่องหมายว่า ${report.id} ไม่มีมูล` })}
                      >
                        <X className="h-4 w-4" />
                        ไม่มีมูล
                      </Button>
                      {report.status === "open" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toast({ tone: "info", message: `รับเรื่อง ${report.id} เข้าตรวจสอบแล้ว` })}
                        >
                          รับเรื่องมาตรวจ
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
