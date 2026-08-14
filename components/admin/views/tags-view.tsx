"use client";

import { ExternalLink, Merge, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { novels, popularTags } from "@/data/mock-data";

type TagRow = { name: string; usage: number; novels: string[] };

export function TagsView() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ original: string; value: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [merging, setMerging] = useState<TagRow | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [pendingDelete, setPendingDelete] = useState<TagRow | null>(null);

  /** รวมแท็กที่ประกาศไว้กับแท็กที่ถูกใช้จริงในนิยาย เพื่อไม่ให้แท็กตกหล่น */
  const allTags = useMemo<TagRow[]>(() => {
    const map = new Map<string, string[]>();
    popularTags.forEach((tag) => map.set(tag, []));
    novels.forEach((novel) =>
      novel.tags.forEach((tag) => map.set(tag, [...(map.get(tag) ?? []), novel.thaiTitle]))
    );

    return [...map.entries()]
      .map(([name, usedBy]) => ({ name, usage: usedBy.length, novels: usedBy }))
      .sort((a, b) => b.usage - a.usage || a.name.localeCompare(b.name));
  }, []);

  const rows = useMemo(
    () => allTags.filter((tag) => !search || tag.name.toLowerCase().includes(search.toLowerCase())),
    [allTags, search]
  );

  const columns: Column<TagRow>[] = [
    {
      key: "name",
      header: "แท็ก",
      cell: (tag) => <span className="font-semibold">{tag.name}</span>
    },
    {
      key: "usage",
      header: "จำนวนเรื่องที่ใช้",
      className: "tabular",
      cell: (tag) => tag.usage.toLocaleString("th-TH")
    },
    {
      key: "novels",
      header: "ตัวอย่างเรื่องที่ใช้แท็กนี้",
      hideBelow: "md",
      cell: (tag) => (
        <p className="max-w-md truncate text-sm text-muted-foreground">
          {tag.novels.length > 0 ? tag.novels.slice(0, 3).join(" · ") : "ยังไม่มีเรื่องใดใช้แท็กนี้"}
        </p>
      )
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (tag) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับแท็ก ${tag.name}`}
            actions={[
              {
                label: "เปลี่ยนชื่อแท็ก",
                icon: <Pencil className="h-4 w-4" />,
                onSelect: () => setEditing({ original: tag.name, value: tag.name })
              },
              {
                label: "รวมกับแท็กอื่น",
                icon: <Merge className="h-4 w-4" />,
                onSelect: () => {
                  setMerging(tag);
                  setMergeTarget(allTags.find((item) => item.name !== tag.name)?.name ?? "");
                }
              },
              { label: "ดูหน้าแท็กบนเว็บ", icon: <ExternalLink className="h-4 w-4" />, href: `/tag/${tag.name}` },
              { label: "ลบแท็กนี้", icon: <Trash2 className="h-4 w-4" />, tone: "danger", onSelect: () => setPendingDelete(tag) }
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
        searchPlaceholder="ค้นหาแท็ก…"
        onReset={() => setSearch("")}
        resultLabel={`ทั้งหมด ${rows.length.toLocaleString("th-TH")} แท็ก`}
        actions={
          <Button
            onClick={() => {
              setNewTag("");
              setCreating(true);
            }}
          >
            <Plus className="h-4 w-4" />
            เพิ่มแท็ก
          </Button>
        }
      />

      <DataTable caption="ตารางแท็กทั้งหมด" rows={rows} columns={columns} getRowKey={(tag) => tag.name} pageSize={20} />

      {/* เพิ่มแท็กใหม่ */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="เพิ่มแท็ก"
        description="ใช้ชื่อภาษาอังกฤษแบบ Title Case ให้เหมือนกันทั้งระบบ เช่น Time Loop"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                if (newTag.trim().length < 2) return;
                toast({ tone: "success", message: `เพิ่มแท็ก ${newTag} แล้ว` });
                setCreating(false);
              }}
            >
              เพิ่มแท็ก
            </Button>
          </>
        }
      >
        <Field label="ชื่อแท็ก">
          <Input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Time Loop" />
        </Field>
      </Modal>

      {/* เปลี่ยนชื่อ */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="เปลี่ยนชื่อแท็ก"
        description="ทุกเรื่องที่ใช้แท็กนี้จะถูกอัปเดตตามทันที"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast({ tone: "success", message: `เปลี่ยนชื่อแท็กเป็น ${editing?.value} แล้ว` });
                setEditing(null);
              }}
            >
              บันทึก
            </Button>
          </>
        }
      >
        {editing ? (
          <Field label="ชื่อแท็ก">
            <Input value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} />
          </Field>
        ) : null}
      </Modal>

      {/* รวมแท็ก */}
      <Modal
        open={Boolean(merging)}
        onClose={() => setMerging(null)}
        title={`รวมแท็ก ${merging?.name ?? ""}`}
        description="ใช้เมื่อมีแท็กความหมายเดียวกันซ้ำกัน เช่น Regression กับ Time Regression"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setMerging(null)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => {
                toast({ tone: "success", message: `รวม ${merging?.name} เข้ากับ ${mergeTarget} แล้ว` });
                setMerging(null);
              }}
            >
              รวมแท็ก
            </Button>
          </>
        }
      >
        <Field label="รวมเข้ากับแท็ก" hint={`${merging?.usage ?? 0} เรื่องจะถูกย้ายไปใช้แท็กปลายทางแทน`}>
          <Select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}>
            {allTags
              .filter((tag) => tag.name !== merging?.name)
              .map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name} ({tag.usage})
                </option>
              ))}
          </Select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => toast({ tone: "error", message: `ลบแท็ก ${pendingDelete?.name} แล้ว` })}
        title={`ลบแท็ก ${pendingDelete?.name ?? ""}?`}
        description={`แท็กนี้จะถูกถอดออกจาก ${pendingDelete?.usage ?? 0} เรื่องที่ใช้อยู่ ตัวนิยายไม่ได้รับผลกระทบ`}
        confirmLabel="ลบแท็กนี้"
        tone="danger"
      />
    </div>
  );
}
