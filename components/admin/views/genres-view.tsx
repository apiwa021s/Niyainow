"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { slugify } from "@/lib/utils";
import { genres, novels } from "@/data/mock-data";
import type { Genre } from "@/types/novel";

type Draft = { slug: string; name: string; thaiName: string; description: string };

const EMPTY: Draft = { slug: "", name: "", thaiName: "", description: "" };

export function GenresView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Genre | null>(null);
  const [error, setError] = useState<string>();

  /** จำนวนเรื่องจริงในระบบ ณ ตอนนี้ — ต่างจาก count ที่เป็นตัวเลขโชว์หน้าเว็บ */
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    novels.forEach((novel) => novel.genres.forEach((slug) => map.set(slug, (map.get(slug) ?? 0) + 1)));
    return map;
  }, []);

  const rows = useMemo(
    () =>
      genres.filter(
        (genre) =>
          !search || [genre.thaiName, genre.name, genre.slug].some((field) => field.toLowerCase().includes(search.toLowerCase()))
      ),
    [search]
  );

  function openCreate() {
    setEditing(EMPTY);
    setIsNew(true);
    setError(undefined);
  }

  function openEdit(genre: Genre) {
    setEditing({ slug: genre.slug, name: genre.name, thaiName: genre.thaiName, description: genre.description });
    setIsNew(false);
    setError(undefined);
  }

  function save() {
    if (!editing) return;
    if (editing.thaiName.trim().length < 2 || editing.slug.trim().length < 2) {
      setError("กรุณากรอกชื่อภาษาไทยและ slug ให้ครบ");
      return;
    }
    toast({ tone: "success", message: isNew ? `เพิ่มแนว ${editing.thaiName} แล้ว` : `บันทึกแนว ${editing.thaiName} แล้ว` });
    setEditing(null);
  }

  const columns: Column<Genre>[] = [
    {
      key: "name",
      header: "แนว",
      cell: (genre) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{genre.thaiName}</p>
          <p className="truncate text-xs text-muted-foreground">{genre.name}</p>
        </div>
      )
    },
    {
      key: "slug",
      header: "Slug",
      hideBelow: "sm",
      cell: (genre) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{genre.slug}</code>
    },
    {
      key: "description",
      header: "คำอธิบาย",
      hideBelow: "lg",
      cell: (genre) => <p className="max-w-md truncate text-sm text-muted-foreground">{genre.description}</p>
    },
    {
      key: "usage",
      header: "เรื่องในระบบ",
      className: "tabular",
      cell: (genre) => (usage.get(genre.slug) ?? 0).toLocaleString("th-TH")
    },
    {
      key: "count",
      header: "ตัวเลขที่แสดงบนเว็บ",
      hideBelow: "xl",
      className: "tabular",
      cell: (genre) => genre.count.toLocaleString("th-TH")
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (genre) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับแนว ${genre.thaiName}`}
            actions={[
              { label: "แก้ไขแนวนี้", icon: <Pencil className="h-4 w-4" />, onSelect: () => openEdit(genre) },
              { label: "ดูหน้าแนวบนเว็บ", icon: <ExternalLink className="h-4 w-4" />, href: `/genre/${genre.slug}` },
              {
                label: "ลบแนวนี้",
                icon: <Trash2 className="h-4 w-4" />,
                tone: "danger",
                onSelect: () => setPendingDelete(genre)
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
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ค้นหาแนวนิยาย…"
        onReset={() => setSearch("")}
        resultLabel={`ทั้งหมด ${rows.length.toLocaleString("th-TH")} แนว`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            เพิ่มแนว
          </Button>
        }
      />

      <DataTable caption="ตารางแนวนิยายทั้งหมด" rows={rows} columns={columns} getRowKey={(genre) => genre.slug} pageSize={20} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? "เพิ่มแนวนิยาย" : "แก้ไขแนวนิยาย"}
        description="ชื่อภาษาไทยคือสิ่งที่ผู้อ่านเห็น ส่วน slug ใช้ในลิงก์ /genre/…"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button onClick={save}>{isNew ? "เพิ่มแนว" : "บันทึก"}</Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4">
            <Field label="ชื่อภาษาไทย" error={error}>
              <Input
                value={editing.thaiName}
                onChange={(event) => setEditing({ ...editing, thaiName: event.target.value })}
                placeholder="เช่น แฟนตาซี"
              />
            </Field>
            <Field label="ชื่อภาษาอังกฤษ">
              <Input
                value={editing.name}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    name: event.target.value,
                    slug: isNew ? slugify(event.target.value) : editing.slug
                  })
                }
                placeholder="Fantasy"
              />
            </Field>
            <Field label="Slug" hint={isNew ? "สร้างอัตโนมัติจากชื่ออังกฤษ แก้เองได้" : "เปลี่ยนแล้วลิงก์เดิมจะเข้าไม่ได้"}>
              <Input value={editing.slug} onChange={(event) => setEditing({ ...editing, slug: event.target.value })} />
            </Field>
            <Field label="คำอธิบาย" hint="แสดงใต้ชื่อแนวในหน้ารวมแนว">
              <Textarea
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                className="min-h-20"
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => toast({ tone: "error", message: `ลบแนว ${pendingDelete?.thaiName} แล้ว` })}
        title={`ลบแนว ${pendingDelete?.thaiName ?? ""}?`}
        description={`มีนิยาย ${usage.get(pendingDelete?.slug ?? "") ?? 0} เรื่องที่ใช้แนวนี้อยู่ เรื่องเหล่านั้นจะถูกถอดแนวนี้ออกแต่ยังอยู่ในระบบตามปกติ`}
        confirmLabel="ลบแนวนี้"
        tone="danger"
      />

      <p className="text-xs text-muted-foreground">
        ต้องการดูว่าแนวไหนมีคนอ่านมากที่สุด? ดูได้ที่{" "}
        <Link href="/admin/analytics" prefetch className="font-semibold text-[var(--brand-light-on-light)] hover:underline">
          หน้าสถิติเชิงลึก
        </Link>
      </p>
    </div>
  );
}
