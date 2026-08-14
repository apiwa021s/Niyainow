"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ExternalLink, EyeOff, FileStack, Pencil, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { RowMenu } from "@/components/admin/row-menu";
import { ConfirmDialog } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { useToast } from "@/components/ui/toast";
import { PUBLISH_STATUS } from "@/lib/admin-labels";
import { formatNumber } from "@/lib/utils";
import { genres } from "@/data/mock-data";
import { getAdminNovels, type AdminNovelQuery, type AdminNovelSort } from "@/services/admin-service";
import type { AdminNovel, PublishStatus } from "@/types/admin";

const SORT_OPTIONS = [
  { value: "updated", label: "อัปเดตล่าสุด" },
  { value: "views", label: "ยอดอ่านสูงสุด" },
  { value: "revenue", label: "รายได้สูงสุด" },
  { value: "chapters", label: "จำนวนตอน" },
  { value: "title", label: "ชื่อเรื่อง ก–ฮ" }
];

export function NovelsView({ initialQuery }: { initialQuery: AdminNovelQuery }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/novels", {
    q: initialQuery.q,
    status: initialQuery.status,
    genre: initialQuery.genre,
    sort: initialQuery.sort ?? "updated"
  });
  const [pendingDelete, setPendingDelete] = useState<AdminNovel | null>(null);

  const rows = useMemo(
    () =>
      getAdminNovels({
        q: query.q,
        status: query.status as PublishStatus | "all" | undefined,
        genre: query.genre,
        sort: query.sort as AdminNovelSort
      }),
    [query]
  );

  const columns: Column<AdminNovel>[] = [
    {
      key: "title",
      header: "เรื่อง",
      cell: (novel) => (
        <div className="flex items-center gap-3">
          <Image
            src={novel.cover}
            alt=""
            width={36}
            height={52}
            className="h-13 w-9 shrink-0 rounded-[6px] object-cover"
            sizes="36px"
          />
          <div className="min-w-0">
            <Link href={`/admin/novels/${novel.slug}`} prefetch className="block truncate font-semibold hover:underline">
              {novel.thaiTitle}
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              {novel.author} · {novel.owner}
            </p>
          </div>
        </div>
      )
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (novel) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={PUBLISH_STATUS[novel.publishStatus].label} tone={PUBLISH_STATUS[novel.publishStatus].tone} />
          {novel.reports > 0 ? <span className="text-xs text-destructive">มีรายงาน {novel.reports} รายการ</span> : null}
        </div>
      )
    },
    {
      key: "chapters",
      header: "ตอน",
      hideBelow: "md",
      cell: (novel) => (
        <div className="tabular">
          <p className="font-medium">{novel.chapters.toLocaleString("th-TH")}</p>
          {novel.scheduledChapters > 0 ? (
            <p className="text-xs text-muted-foreground">ตั้งเวลาไว้ {novel.scheduledChapters}</p>
          ) : null}
        </div>
      )
    },
    {
      key: "views",
      header: "ยอดอ่าน",
      hideBelow: "lg",
      cell: (novel) => (
        <div className="tabular">
          <p className="font-medium">{formatNumber(novel.views)}</p>
          <p className="text-xs text-muted-foreground">+{formatNumber(novel.viewsThisWeek)} สัปดาห์นี้</p>
        </div>
      )
    },
    {
      key: "revenue",
      header: "รายได้",
      hideBelow: "lg",
      cell: (novel) => <span className="tabular font-medium">{novel.revenueTHB.toLocaleString("th-TH")} ฿</span>
    },
    {
      key: "updated",
      header: "อัปเดต",
      hideBelow: "xl",
      cell: (novel) => <span className="whitespace-nowrap text-xs text-muted-foreground">{novel.updatedAt}</span>
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (novel) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับ ${novel.thaiTitle}`}
            actions={[
              { label: "แก้ไขข้อมูลเรื่อง", icon: <Pencil className="h-4 w-4" />, href: `/admin/novels/${novel.slug}` },
              { label: "จัดการตอน", icon: <FileStack className="h-4 w-4" />, href: `/admin/novels/${novel.slug}/chapters` },
              { label: "เปิดหน้าเว็บจริง", icon: <ExternalLink className="h-4 w-4" />, href: `/novel/${novel.slug}` },
              {
                label: novel.featured ? "เอาออกจากแนะนำ" : "ตั้งเป็นเรื่องแนะนำ",
                icon: <Star className="h-4 w-4" />,
                onSelect: () =>
                  toast({
                    tone: "success",
                    message: novel.featured ? `เอา ${novel.thaiTitle} ออกจากเรื่องแนะนำแล้ว` : `ตั้ง ${novel.thaiTitle} เป็นเรื่องแนะนำแล้ว`
                  })
              },
              {
                label: "ซ่อนจากหน้าเว็บ",
                icon: <EyeOff className="h-4 w-4" />,
                onSelect: () => toast({ tone: "info", message: `ซ่อน ${novel.thaiTitle} จากหน้าเว็บแล้ว` })
              },
              {
                label: "ลบเรื่องนี้",
                icon: <Trash2 className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => setPendingDelete(novel)
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
        searchPlaceholder="ค้นหาชื่อเรื่อง ผู้แต่ง หรือทีมแปล…"
        filters={[
          {
            key: "status",
            label: "สถานะ",
            value: query.status ?? "all",
            options: allOption(
              (Object.keys(PUBLISH_STATUS) as PublishStatus[]).map((status) => ({
                value: status,
                label: PUBLISH_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          },
          {
            key: "genre",
            label: "แนว",
            value: query.genre ?? "all",
            options: allOption(genres.map((genre) => ({ value: genre.slug, label: genre.thaiName }))),
            onChange: (value) => setQuery({ genre: value })
          },
          {
            key: "sort",
            label: "เรียงตาม",
            value: query.sort ?? "updated",
            options: SORT_OPTIONS,
            onChange: (value) => setQuery({ sort: value })
          }
        ]}
        onReset={reset}
        resultLabel={`พบ ${rows.length.toLocaleString("th-TH")} เรื่อง`}
      />

      <DataTable
        caption="ตารางนิยายทั้งหมดในระบบ"
        rows={rows}
        columns={columns}
        getRowKey={(novel) => novel.slug}
        selectable
        bulkActions={[
          {
            label: "เผยแพร่",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "success", message: `เผยแพร่ ${ids.length} เรื่องแล้ว` })
          },
          {
            label: "ซ่อน",
            icon: <EyeOff className="h-3.5 w-3.5" />,
            onRun: (ids) => toast({ tone: "info", message: `ซ่อน ${ids.length} เรื่องจากหน้าเว็บแล้ว` })
          },
          {
            label: "ลบ",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            tone: "danger",
            onRun: (ids) => toast({ tone: "error", message: `ลบ ${ids.length} เรื่องแล้ว`, action: { label: "เลิกทำ", onClick: () => {} } })
          }
        ]}
        empty={
          <div className="text-center">
            <p className="text-sm font-semibold">ไม่พบนิยายที่ตรงกับตัวกรองนี้</p>
            <p className="mt-1 text-sm text-muted-foreground">ลองล้างตัวกรอง หรือเพิ่มเรื่องใหม่เข้าระบบ</p>
          </div>
        }
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() =>
          toast({
            tone: "error",
            message: `ลบ ${pendingDelete?.thaiTitle} แล้ว`,
            action: { label: "เลิกทำ", onClick: () => toast({ tone: "success", message: "กู้คืนเรื่องกลับมาแล้ว" }) }
          })
        }
        title={`ลบ ${pendingDelete?.thaiTitle ?? ""}?`}
        description={`ตอนทั้งหมด ${pendingDelete?.chapters ?? 0} ตอน คอมเมนต์ และประวัติการอ่านของเรื่องนี้จะถูกลบไปด้วย ผู้ที่ซื้อตอนไว้จะได้รับเหรียญคืนอัตโนมัติ`}
        confirmLabel="ลบเรื่องนี้"
        tone="danger"
      />
    </div>
  );
}
