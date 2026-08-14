"use client";

import Link from "next/link";
import { CheckCircle2, Coins, Copy, ExternalLink, FileEdit, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { useToast } from "@/components/ui/toast";
import { PUBLISH_STATUS } from "@/lib/admin-labels";
import { formatNumber } from "@/lib/utils";
import { adminNovels } from "@/data/admin-data";
import { getAdminChapters, type AdminChapterQuery } from "@/services/admin-service";
import type { AdminChapter, PublishStatus } from "@/types/admin";

/**
 * ตารางตอน — ใช้ได้ทั้งหน้ารวมทุกเรื่อง (/admin/chapters)
 * และหน้าตอนของเรื่องเดียว (/admin/novels/[slug]/chapters)
 * ต่างกันแค่มีตัวกรอง "เรื่อง" หรือไม่
 */
export function ChaptersView({
  initialQuery,
  basePath,
  novelSlug
}: {
  initialQuery: AdminChapterQuery;
  basePath: string;
  novelSlug?: string;
}) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery(basePath, {
    q: initialQuery.q,
    novel: novelSlug ?? initialQuery.novel,
    status: initialQuery.status,
    access: initialQuery.access
  });

  const rows = useMemo(
    () =>
      getAdminChapters({
        q: query.q,
        novel: novelSlug ?? query.novel,
        status: query.status as PublishStatus | "all" | undefined,
        access: query.access as "free" | "paid" | "all" | undefined
      }),
    [query, novelSlug]
  );

  const columns: Column<AdminChapter>[] = [
    {
      key: "number",
      header: "ตอนที่",
      className: "tabular w-16 font-semibold",
      cell: (chapter) => chapter.number.toLocaleString("th-TH")
    },
    {
      key: "title",
      header: "ชื่อตอน",
      cell: (chapter) => (
        <div className="min-w-0">
          <Link
            href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.number}`}
            prefetch
            className="block truncate font-medium hover:underline"
          >
            {chapter.title}
          </Link>
          {!novelSlug ? <p className="truncate text-xs text-muted-foreground">{chapter.novelTitle}</p> : null}
        </div>
      )
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (chapter) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={PUBLISH_STATUS[chapter.publishStatus].label} tone={PUBLISH_STATUS[chapter.publishStatus].tone} />
          {chapter.scheduledFor ? <span className="text-xs text-muted-foreground">{chapter.scheduledFor}</span> : null}
        </div>
      )
    },
    {
      key: "access",
      header: "การเข้าถึง",
      hideBelow: "md",
      cell: (chapter) =>
        chapter.locked ? (
          <span className="tabular inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-pink-on-light)]">
            <Coins className="h-3.5 w-3.5" aria-hidden />
            {chapter.coinPrice} เหรียญ
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">อ่านฟรี</span>
        )
    },
    {
      key: "words",
      header: "จำนวนคำ",
      hideBelow: "lg",
      className: "tabular",
      cell: (chapter) => chapter.words.toLocaleString("th-TH")
    },
    {
      key: "views",
      header: "ยอดอ่าน",
      hideBelow: "lg",
      className: "tabular",
      cell: (chapter) => formatNumber(chapter.views)
    },
    {
      key: "comments",
      header: "คอมเมนต์",
      hideBelow: "xl",
      className: "tabular",
      cell: (chapter) => chapter.comments.toLocaleString("th-TH")
    },
    {
      key: "updated",
      header: "แก้ไขล่าสุด",
      hideBelow: "xl",
      cell: (chapter) => (
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          <p>{chapter.updatedAt}</p>
          <p>โดย {chapter.editor}</p>
        </div>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (chapter) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับตอนที่ ${chapter.number}`}
            actions={[
              {
                label: "แก้ไขตอน",
                icon: <FileEdit className="h-4 w-4" />,
                href: `/admin/novels/${chapter.novelSlug}/chapters/${chapter.number}`
              },
              {
                label: "เปิดหน้าเว็บจริง",
                icon: <ExternalLink className="h-4 w-4" />,
                href: `/novel/${chapter.novelSlug}/chapter/${chapter.number}`
              },
              {
                label: "ทำสำเนาเป็นฉบับร่าง",
                icon: <Copy className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `ทำสำเนาตอนที่ ${chapter.number} เป็นฉบับร่างแล้ว` })
              },
              {
                label: "ลบตอนนี้",
                icon: <Trash2 className="h-4 w-4" />,
                tone: "danger",
                onSelect: () =>
                  toast({
                    tone: "error",
                    message: `ลบตอนที่ ${chapter.number} แล้ว`,
                    action: { label: "เลิกทำ", onClick: () => toast({ tone: "success", message: "กู้คืนตอนกลับมาแล้ว" }) }
                  })
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
        searchPlaceholder="ค้นหาชื่อตอนหรือเลขตอน…"
        filters={[
          ...(novelSlug
            ? []
            : [
                {
                  key: "novel",
                  label: "เรื่อง",
                  value: query.novel ?? "all",
                  options: allOption(adminNovels.map((novel) => ({ value: novel.slug, label: novel.thaiTitle })), "ทุกเรื่อง"),
                  onChange: (value: string) => setQuery({ novel: value })
                }
              ]),
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (["published", "scheduled", "draft"] as PublishStatus[]).map((status) => ({
                value: status,
                label: PUBLISH_STATUS[status].label
              }))
            ),
            onChange: (value: string) => setQuery({ status: value })
          },
          {
            key: "access",
            label: "การเข้าถึง",
            value: query.access ?? "all",
            options: allOption([
              { value: "free", label: "อ่านฟรี" },
              { value: "paid", label: "ใช้เหรียญ" }
            ]),
            onChange: (value: string) => setQuery({ access: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} ตอน`}
      />

      <DataTable
        caption="ตารางตอนทั้งหมด"
        rows={rows}
        columns={columns}
        getRowKey={(chapter) => chapter.id}
        selectable
        pageSize={15}
        bulkActions={[
          {
            label: "เผยแพร่ทันที",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "success", message: `เผยแพร่ ${ids.length} ตอนแล้ว` })
          },
          {
            label: "ตั้งเป็นตอนฟรี",
            icon: <Coins className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "info", message: `ปลดล็อกให้อ่านฟรี ${ids.length} ตอนแล้ว` })
          },
          {
            label: "ลบ",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            tone: "danger",
            onRun: (ids) => toast({ tone: "error", message: `ลบ ${ids.length} ตอนแล้ว` })
          }
        ]}
        empty={
          <div className="text-center">
            <p className="text-sm font-semibold">ยังไม่มีตอนที่ตรงกับตัวกรองนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">ลองล้างตัวกรอง หรือเพิ่มตอนใหม่เข้ามา</p>
          </div>
        }
      />
    </div>
  );
}
