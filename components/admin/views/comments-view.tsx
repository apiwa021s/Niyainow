"use client";

import Link from "next/link";
import { Check, EyeOff, Flag, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { useMemo } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { useToast } from "@/components/ui/toast";
import { COMMENT_STATUS } from "@/lib/admin-labels";
import { getAdminComments, type CommentQuery } from "@/services/admin-service";
import type { AdminComment, CommentStatus } from "@/types/admin";

export function CommentsView({ initialQuery }: { initialQuery: CommentQuery & { reported?: string } }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/comments", {
    q: initialQuery.q,
    status: initialQuery.status,
    reported: initialQuery.reported
  });

  const rows = useMemo(
    () =>
      getAdminComments({
        q: query.q,
        status: query.status as CommentStatus | "all" | undefined,
        reported: query.reported === "1"
      }),
    [query]
  );

  const columns: Column<AdminComment>[] = [
    {
      key: "body",
      header: "ข้อความ",
      cell: (comment) => (
        <div className="min-w-0 max-w-xl">
          <p className="text-sm leading-relaxed">{comment.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Link href={`/admin/users/${comment.memberId}`} prefetch className="font-semibold hover:underline">
              {comment.author}
            </Link>{" "}
            · {comment.createdAt}
          </p>
        </div>
      )
    },
    {
      key: "where",
      header: "อยู่ที่",
      hideBelow: "md",
      cell: (comment) => (
        <div className="min-w-0">
          <Link
            href={`/admin/novels/${comment.novelSlug}/chapters/${comment.chapter}`}
            prefetch
            className="block truncate text-sm font-medium hover:underline"
          >
            {comment.novelTitle}
          </Link>
          <p className="text-xs text-muted-foreground">ตอนที่ {comment.chapter}</p>
        </div>
      )
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (comment) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={COMMENT_STATUS[comment.status].label} tone={COMMENT_STATUS[comment.status].tone} />
          {comment.reports > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-destructive">
              <Flag className="h-3 w-3" aria-hidden />
              {comment.reports} รายงาน
            </span>
          ) : null}
        </div>
      )
    },
    {
      key: "likes",
      header: "ถูกใจ",
      hideBelow: "xl",
      className: "tabular",
      cell: (comment) => comment.likes.toLocaleString("th-TH")
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (comment) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับคอมเมนต์ของ ${comment.author}`}
            actions={[
              {
                label: "อนุมัติให้แสดง",
                icon: <Check className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: "อนุมัติคอมเมนต์แล้ว" })
              },
              {
                label: "ซ่อนคอมเมนต์",
                icon: <EyeOff className="h-4 w-4" />,
                onSelect: () =>
                  toast({
                    tone: "info",
                    message: "ซ่อนคอมเมนต์แล้ว",
                    action: { label: "เลิกทำ", onClick: () => toast({ tone: "success", message: "เอากลับมาแสดงแล้ว" }) }
                  })
              },
              {
                label: "ทำเครื่องหมายว่าสแปม",
                icon: <ShieldAlert className="h-4 w-4" />,
                onSelect: () => toast({ tone: "info", message: "ทำเครื่องหมายเป็นสแปมและซ่อนคอมเมนต์แล้ว" })
              },
              { label: "ดูโปรไฟล์ผู้เขียน", icon: <UserRound className="h-4 w-4" />, href: `/admin/users/${comment.memberId}` },
              {
                label: "ลบถาวร",
                icon: <Trash2 className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => toast({ tone: "error", message: "ลบคอมเมนต์ถาวรแล้ว" })
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
        searchPlaceholder="ค้นหาข้อความ ชื่อผู้เขียน หรือชื่อเรื่อง…"
        filters={[
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(COMMENT_STATUS) as CommentStatus[]).map((status) => ({
                value: status,
                label: COMMENT_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          },
          {
            key: "reported",
            label: "การรายงาน",
            value: query.reported ?? "all",
            options: [
              { value: "all", label: "ทั้งหมด" },
              { value: "1", label: "เฉพาะที่ถูกรายงาน" }
            ],
            onChange: (value) => setQuery({ reported: value === "1" ? "1" : undefined })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} คอมเมนต์`}
      />

      <DataTable
        caption="ตารางคอมเมนต์ทั้งหมด"
        rows={rows}
        columns={columns}
        getRowKey={(comment) => comment.id}
        selectable
        pageSize={10}
        bulkActions={[
          {
            label: "อนุมัติ",
            icon: <Check className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "success", message: `อนุมัติ ${ids.length} คอมเมนต์แล้ว` })
          },
          {
            label: "ซ่อน",
            icon: <EyeOff className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "info", message: `ซ่อน ${ids.length} คอมเมนต์แล้ว` })
          },
          {
            label: "ลบถาวร",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            tone: "danger",
            onRun: (ids) => toast({ tone: "error", message: `ลบ ${ids.length} คอมเมนต์แล้ว` })
          }
        ]}
        empty={
          <div className="text-center">
            <p className="text-sm font-semibold">ไม่มีคอมเมนต์ในคิวนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">เคลียร์หมดแล้ว — ลองเปลี่ยนตัวกรองเพื่อดูรายการอื่น</p>
          </div>
        }
      />
    </div>
  );
}
