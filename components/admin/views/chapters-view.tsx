"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ChevronDown, ChevronUp, Eye, GripVertical, Pencil, Save, Send, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { assetUrl, publicAssetFallbacks } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import type { AdminChapterQuery, AdminChapterRow, AdminPage, ChapterStatus } from "@/services/admin-service";

const statusMeta: Record<ChapterStatus, { label: string; tone: "neutral" | "info" | "success" }> = {
  DRAFT: { label: "ฉบับร่าง", tone: "neutral" },
  SCHEDULED: { label: "ตั้งเวลา", tone: "info" },
  PUBLISHED: { label: "เผยแพร่", tone: "success" },
  UNPUBLISHED: { label: "ถอนเผยแพร่", tone: "neutral" },
  ARCHIVED: { label: "เก็บถาวร", tone: "neutral" },
};

type BulkAction = "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "DELETE";
type ChapterViewSort = NonNullable<AdminChapterQuery["sort"]>;

const bulkActionLabels: Record<BulkAction, string> = {
  PUBLISH: "เผยแพร่",
  UNPUBLISH: "ถอนเผยแพร่",
  ARCHIVE: "เก็บถาวร",
  DELETE: "ลบ",
};

function pageHref(query: AdminChapterQuery, page: number, basePath: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value && value !== "all" && !(key === "novel" && basePath.includes("/novels/"))) params.set(key, String(value));
  }
  return `${basePath}?${params}`;
}

function apiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง";
  const error = payload.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") {
    return "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง";
  }
  return error.message;
}

type ChaptersViewProps = {
  result: AdminPage<AdminChapterRow>;
  query: AdminChapterQuery;
  basePath?: string;
  fixedNovelSlug?: string;
};

export function ChaptersView(props: ChaptersViewProps) {
  const stateKey = [
    props.query.mode ?? "view",
    props.query.sort ?? "updated",
    props.result.page,
    ...props.result.items.map((chapter) => `${chapter.id}:${chapter.sortOrder}`),
  ].join("|");
  return <ChaptersViewContent key={stateKey} {...props} />;
}

function ChaptersViewContent({
  result,
  query,
  basePath = "/admin/chapters",
  fixedNovelSlug,
}: ChaptersViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>("PUBLISH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderedItems, setOrderedItems] = useState(() => result.items);
  const [isReordering, setIsReordering] = useState(query.mode === "reorder");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const visibleIds = result.items.map((chapter) => chapter.id);
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const displayedItems = isReordering ? orderedItems : result.items;
  const orderedSlotValues = result.items.map((chapter) => chapter.sortOrder).toSorted((left, right) => left - right);
  const hasOrderChanges = orderedItems.some((chapter, index) => chapter.id !== result.items[index]?.id);

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (allVisibleSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function runBulkAction() {
    const chapterIds = visibleIds.filter((id) => selectedIds.has(id));
    if (!chapterIds.length) return;
    if (
      (bulkAction === "DELETE" || bulkAction === "ARCHIVE")
      && !window.confirm(`ยืนยันการ${bulkActionLabels[bulkAction]} ${chapterIds.length} ตอนพร้อมกัน?`)
    ) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/chapters/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chapterIds, action: bulkAction }),
      });
      const payload = await response.json().catch(() => null) as unknown;
      if (!response.ok) throw new Error(apiErrorMessage(payload));
      setSelectedIds(new Set());
      toast({ tone: "success", message: `${bulkActionLabels[bulkAction]} ${chapterIds.length} ตอนเรียบร้อยแล้ว` });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeViewSort(sort: ChapterViewSort) {
    router.push(pageHref({ ...query, sort, mode: undefined }, 1, basePath));
  }

  function beginReorder() {
    if (!fixedNovelSlug || result.items.length < 2) return;
    const isUnfilteredOrderView = query.sort === "order-asc"
      && !query.q
      && (!query.status || query.status === "all");
    if (!isUnfilteredOrderView) {
      router.push(pageHref({ novel: fixedNovelSlug, sort: "order-asc", mode: "reorder" }, 1, basePath));
      return;
    }
    setSelectedIds(new Set());
    setOrderedItems(result.items);
    setIsReordering(true);
    router.replace(pageHref({ ...query, mode: "reorder" }, result.page, basePath));
  }

  function leaveReorder() {
    if (hasOrderChanges && !window.confirm("ยกเลิกการจัดลำดับและทิ้งการเปลี่ยนแปลงหรือไม่?")) return;
    setOrderedItems(result.items);
    setIsReordering(false);
    router.replace(pageHref({ ...query, mode: undefined }, result.page, basePath));
  }

  function moveChapter(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    setOrderedItems((current) => {
      const sourceIndex = current.findIndex((chapter) => chapter.id === sourceId);
      const targetIndex = current.findIndex((chapter) => chapter.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveChapterBy(id: string, offset: -1 | 1) {
    const index = orderedItems.findIndex((chapter) => chapter.id === id);
    const target = orderedItems[index + offset];
    if (index < 0 || !target) return;
    moveChapter(id, target.id);
  }

  async function saveOrder() {
    if (!fixedNovelSlug || !hasOrderChanges) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/chapters/reorder", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          novelSlug: fixedNovelSlug,
          chapters: orderedItems.map((chapter) => ({ id: chapter.id, sortOrder: chapter.sortOrder })),
        }),
      });
      const payload = await response.json().catch(() => null) as unknown;
      if (!response.ok) throw new Error(apiErrorMessage(payload));
      toast({ tone: "success", message: `บันทึกลำดับ ${orderedItems.length} ตอนเรียบร้อยแล้ว` });
      setIsReordering(false);
      router.replace(pageHref({ ...query, mode: undefined }, result.page, basePath));
      router.refresh();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "บันทึกลำดับไม่สำเร็จ กรุณาลองอีกครั้ง" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Panel bodyClassName="p-4">
        <form action={basePath} method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="sort" value={query.sort ?? "updated"} />
          <label className="grid min-w-52 flex-1 gap-1 text-xs font-medium text-muted-foreground">ค้นหา<Input name="q" defaultValue={query.q ?? ""} placeholder="ชื่อตอน ชื่อเรื่อง หรือเลขตอน" /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">สถานะ<Select name="status" defaultValue={query.status ?? "all"} className="min-w-36">
            <option value="all">ทั้งหมด</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </Select></label>
          {!fixedNovelSlug ? <label className="grid gap-1 text-xs font-medium text-muted-foreground">Slug เรื่อง<Input name="novel" defaultValue={query.novel ?? ""} className="min-w-44" /></label> : null}
          <button className="h-11 rounded-[12px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
          <ButtonLink href={basePath} variant="outline">ล้างตัวกรอง</ButtonLink>
        </form>
      </Panel>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{isReordering ? "จัดลำดับตอน" : "จัดการหลายตอน"}</p>
            <p className="text-xs text-muted-foreground">
              {isReordering ? "ลากที่ไอคอนหรือใช้ปุ่มขึ้น–ลง แล้วบันทึกลำดับของตอนในหน้านี้" : "เรียงมุมมองได้โดยไม่เปลี่ยนลำดับอ่านจริง"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isReordering ? <>
              <Button type="button" variant="outline" onClick={leaveReorder} disabled={isSubmitting}>
                <X className="h-4 w-4" />ยกเลิก
              </Button>
              <Button type="button" onClick={saveOrder} loading={isSubmitting} disabled={!hasOrderChanges}>
                <Save className="h-4 w-4" />บันทึกลำดับ
              </Button>
            </> : <>
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                เรียงมุมมอง
                <Select
                  key={query.sort ?? "updated"}
                  aria-label="เรียงมุมมองตอน"
                  defaultValue={query.sort ?? "updated"}
                  onChange={(event) => changeViewSort(event.target.value as ChapterViewSort)}
                  className="w-auto min-w-48"
                >
                  <option value="updated">อัปเดตล่าสุด</option>
                  <option value="order-asc">ลำดับอ่าน: น้อย → มาก</option>
                  <option value="order-desc">ลำดับอ่าน: มาก → น้อย</option>
                  <option value="number-asc">เลขตอน: น้อย → มาก</option>
                  <option value="number-desc">เลขตอน: มาก → น้อย</option>
                </Select>
              </label>
              {fixedNovelSlug ? <Button type="button" variant="outline" onClick={beginReorder} disabled={result.items.length < 2}>
                <GripVertical className="h-4 w-4" />ย้ายตอน
              </Button> : null}
              <span className="text-sm font-medium text-muted-foreground">เลือกแล้ว {visibleSelectedCount} ตอน</span>
              <Select
                aria-label="คำสั่งสำหรับตอนที่เลือก"
                value={bulkAction}
                onChange={(event) => setBulkAction(event.target.value as BulkAction)}
                className="w-auto min-w-36"
                disabled={!visibleSelectedCount || isSubmitting}
              >
                <option value="PUBLISH">เผยแพร่</option>
                <option value="UNPUBLISH">ถอนเผยแพร่</option>
                <option value="ARCHIVE">เก็บถาวร</option>
                <option value="DELETE">ลบ (soft delete)</option>
              </Select>
              <Button
                type="button"
                onClick={runBulkAction}
                loading={isSubmitting}
                disabled={!visibleSelectedCount}
                variant={bulkAction === "DELETE" ? "danger" : "primary"}
              >
                {bulkAction === "PUBLISH" ? <Send className="h-4 w-4" /> : null}
                {bulkAction === "UNPUBLISH" ? <Undo2 className="h-4 w-4" /> : null}
                {bulkAction === "ARCHIVE" ? <Archive className="h-4 w-4" /> : null}
                {bulkAction === "DELETE" ? <Trash2 className="h-4 w-4" /> : null}
                ใช้คำสั่ง
              </Button>
            </>}
          </div>
        </div>

        <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-sm">
          <caption className="sr-only">รายการตอนนิยาย</caption>
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
            <th className="w-12 px-4 py-3">
              {isReordering ? <GripVertical className="h-4 w-4" aria-hidden /> : <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                aria-label="เลือกตอนทั้งหมดในหน้านี้"
                className="h-4 w-4 accent-[var(--brand-primary)]"
              />}
            </th>
            <th className="px-4 py-3">ตอน</th><th className="px-4 py-3">เรื่อง</th><th className="px-4 py-3">ลำดับ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">คำ</th><th className="px-4 py-3">อัปเดต</th><th className="px-4 py-3"><span className="sr-only">คำสั่ง</span></th>
          </tr></thead>
          <tbody>
            {displayedItems.map((chapter, index) => (
              <tr
                key={chapter.id}
                onDragOver={isReordering ? (event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverId(chapter.id);
                } : undefined}
                onDrop={isReordering ? (event) => {
                  event.preventDefault();
                  if (draggedId) moveChapter(draggedId, chapter.id);
                  setDraggedId(null);
                  setDragOverId(null);
                } : undefined}
                className={cn(
                  "border-b border-border/70 last:border-0 hover:bg-muted/40",
                  isReordering && "transition-colors",
                  draggedId === chapter.id && "opacity-50",
                  dragOverId === chapter.id && draggedId !== chapter.id && "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)]",
                )}
              >
                <td className="px-4 py-3">
                  {isReordering ? <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", chapter.id);
                        setDraggedId(chapter.id);
                      }}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      aria-label={`ลากเพื่อย้ายตอน ${chapter.chapterNumber}`}
                      title="ลากเพื่อย้าย"
                      className="grid h-9 w-9 cursor-grab place-items-center rounded-[9px] text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveChapterBy(chapter.id, -1)}
                      disabled={index === 0}
                      aria-label={`ย้ายตอน ${chapter.chapterNumber} ขึ้น`}
                      className="grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    ><ChevronUp className="h-4 w-4" /></button>
                    <button
                      type="button"
                      onClick={() => moveChapterBy(chapter.id, 1)}
                      disabled={index === displayedItems.length - 1}
                      aria-label={`ย้ายตอน ${chapter.chapterNumber} ลง`}
                      className="grid h-9 w-9 place-items-center rounded-[9px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    ><ChevronDown className="h-4 w-4" /></button>
                  </div> : <input
                    type="checkbox"
                    checked={selectedIds.has(chapter.id)}
                    onChange={() => toggleOne(chapter.id)}
                    aria-label={`เลือกตอน ${chapter.chapterNumber} ${chapter.title}`}
                    className="h-4 w-4 accent-[var(--brand-primary)]"
                  />}
                </td>
                <td className="px-4 py-3"><Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}`} className="font-semibold hover:underline">{chapter.chapterNumber}: {chapter.title}</Link></td>
                <td className="px-4 py-3">
                  <Link href={`/admin/novels/${chapter.novelSlug}`} className="flex min-w-48 items-center gap-2 text-muted-foreground hover:text-foreground">
                    <span className="relative h-12 w-8 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      <Image
                        src={assetUrl(chapter.novelCoverKey, publicAssetFallbacks.novelCover)}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                    <span className="line-clamp-2">{chapter.novelTitle}</span>
                  </Link>
                </td>
                <td className="tabular px-4 py-3">
                  {isReordering ? <span className="inline-flex min-w-9 justify-center rounded-full bg-[var(--brand-primary)]/10 px-2 py-1 font-semibold text-[var(--brand-primary)]">{orderedSlotValues[index]}</span> : chapter.sortOrder}
                </td>
                <td className="px-4 py-3"><StatusPill {...statusMeta[chapter.status]} /></td>
                <td className="tabular px-4 py-3">{chapter.wordCount.toLocaleString("th-TH")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(chapter.updatedAt).toLocaleString("th-TH")}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}`} aria-label="แก้ไขตอน" className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
                  <Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}/preview`} aria-label="ดูตัวอย่างตอน" className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Eye className="h-4 w-4" /></Link>
                </div></td>
              </tr>
            ))}
            {!result.items.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">ไม่พบตอนที่ตรงกับตัวกรอง</td></tr> : null}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>ทั้งหมด {result.total.toLocaleString("th-TH")} ตอน</span>
          {isReordering ? <span>บันทึกหรือยกเลิกก่อนเปลี่ยนหน้า</span> : <div className="flex items-center gap-2">
              {result.page > 1 ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page - 1, basePath)}>ก่อนหน้า</ButtonLink> : null}
              <span>หน้า {result.page} / {result.totalPages}</span>
              {result.page < result.totalPages ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page + 1, basePath)}>ถัดไป</ButtonLink> : null}
            </div>}
        </div>
      </div>
    </div>
  );
}
