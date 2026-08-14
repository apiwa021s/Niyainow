"use client";

import { Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, FilterBar, allOption, type Column } from "@/components/admin/admin-table";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { RowMenu } from "@/components/admin/row-menu";
import { StatusPill } from "@/components/admin/status-pill";
import { useAdminQuery } from "@/components/admin/use-admin-query";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { ANNOUNCEMENT_AUDIENCE, ANNOUNCEMENT_CHANNEL, ANNOUNCEMENT_STATUS } from "@/lib/admin-labels";
import { getAnnouncements } from "@/services/admin-service";
import type {
  AdminAnnouncement,
  AnnouncementAudience,
  AnnouncementChannel,
  AnnouncementStatus
} from "@/types/admin";

type Draft = {
  title: string;
  body: string;
  channel: AnnouncementChannel;
  audience: AnnouncementAudience;
  scheduledFor: string;
};

const EMPTY: Draft = { title: "", body: "", channel: "banner", audience: "all", scheduledFor: "" };

export function AnnouncementsView({ initialStatus }: { initialStatus?: string }) {
  const { toast } = useToast();
  const { query, setQuery, reset } = useAdminQuery("/admin/announcements", { status: initialStatus });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [sendTarget, setSendTarget] = useState<AdminAnnouncement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);

  const rows = useMemo(() => getAnnouncements(query.status), [query.status]);

  const columns: Column<AdminAnnouncement>[] = [
    {
      key: "title",
      header: "ประกาศ",
      cell: (item) => (
        <div className="min-w-0 max-w-xl">
          <p className="truncate font-semibold">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">{item.body}</p>
        </div>
      )
    },
    {
      key: "channel",
      header: "ช่องทาง",
      hideBelow: "md",
      cell: (item) => <span className="whitespace-nowrap text-sm">{ANNOUNCEMENT_CHANNEL[item.channel]}</span>
    },
    {
      key: "audience",
      header: "กลุ่มเป้าหมาย",
      hideBelow: "lg",
      cell: (item) => <span className="whitespace-nowrap text-sm text-muted-foreground">{ANNOUNCEMENT_AUDIENCE[item.audience]}</span>
    },
    {
      key: "status",
      header: "สถานะ",
      cell: (item) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill label={ANNOUNCEMENT_STATUS[item.status].label} tone={ANNOUNCEMENT_STATUS[item.status].tone} />
          <span className="text-xs text-muted-foreground">{item.scheduledFor}</span>
        </div>
      )
    },
    {
      key: "reach",
      header: "ส่งถึงแล้ว",
      hideBelow: "xl",
      className: "tabular",
      cell: (item) => (item.reach > 0 ? item.reach.toLocaleString("th-TH") : "—")
    },
    {
      key: "actions",
      header: <span className="sr-only">คำสั่ง</span>,
      className: "text-right",
      headClassName: "text-right",
      cell: (item) => (
        <div className="flex justify-end">
          <RowMenu
            label={`คำสั่งสำหรับประกาศ ${item.title}`}
            actions={[
              {
                label: "แก้ไขประกาศ",
                icon: <Pencil className="h-4 w-4" />,
                onSelect: () => {
                  setEditing({
                    title: item.title,
                    body: item.body,
                    channel: item.channel,
                    audience: item.audience,
                    scheduledFor: item.scheduledFor
                  });
                  setIsNew(false);
                }
              },
              {
                label: "ส่งทันที",
                icon: <Send className="h-4 w-4" />,
                onSelect: () => setSendTarget(item),
                disabled: item.status === "sent"
              },
              {
                label: "ทำสำเนา",
                icon: <Copy className="h-4 w-4" />,
                onSelect: () => toast({ tone: "success", message: `ทำสำเนาประกาศ “${item.title}” เป็นฉบับร่างแล้ว` })
              },
              { label: "ลบประกาศ", icon: <Trash2 className="h-4 w-4" />, tone: "danger", onSelect: () => setDeleteTarget(item) }
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
              (Object.keys(ANNOUNCEMENT_STATUS) as AnnouncementStatus[]).map((status) => ({
                value: status,
                label: ANNOUNCEMENT_STATUS[status].label
              }))
            ),
            onChange: (value) => setQuery({ status: value })
          }
        ]}
        onReset={reset}
        resultLabel={`ทั้งหมด ${rows.length.toLocaleString("th-TH")} ประกาศ`}
        actions={
          <Button
            onClick={() => {
              setEditing(EMPTY);
              setIsNew(true);
            }}
          >
            <Plus className="h-4 w-4" />
            สร้างประกาศ
          </Button>
        }
      />

      <DataTable caption="ตารางประกาศและการแจ้งเตือน" rows={rows} columns={columns} getRowKey={(item) => item.id} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? "สร้างประกาศ" : "แก้ไขประกาศ"}
        description="ข้อความควรสั้น บอกผลกระทบต่อผู้อ่านให้ชัดเจน และระบุเวลาที่มีผลเสมอ"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                toast({ tone: "success", message: "บันทึกเป็นฉบับร่างแล้ว" });
                setEditing(null);
              }}
            >
              บันทึกฉบับร่าง
            </Button>
            <Button
              disabled={(editing?.title.trim().length ?? 0) < 5}
              onClick={() => {
                toast({ tone: "success", message: editing?.scheduledFor ? "ตั้งเวลาส่งประกาศแล้ว" : "ส่งประกาศแล้ว" });
                setEditing(null);
              }}
            >
              {editing?.scheduledFor ? "ตั้งเวลาส่ง" : "ส่งทันที"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4">
            <Field label="หัวข้อ">
              <Input
                value={editing.title}
                onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                placeholder="เช่น ปิดปรับปรุงระบบเหรียญ 16 ส.ค. 02:00–04:00 น."
              />
            </Field>
            <Field label="เนื้อหา">
              <Textarea
                value={editing.body}
                onChange={(event) => setEditing({ ...editing, body: event.target.value })}
                className="min-h-24"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ช่องทาง">
                <Select
                  value={editing.channel}
                  onChange={(event) => setEditing({ ...editing, channel: event.target.value as AnnouncementChannel })}
                >
                  {(Object.keys(ANNOUNCEMENT_CHANNEL) as AnnouncementChannel[]).map((channel) => (
                    <option key={channel} value={channel}>
                      {ANNOUNCEMENT_CHANNEL[channel]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="กลุ่มเป้าหมาย">
                <Select
                  value={editing.audience}
                  onChange={(event) => setEditing({ ...editing, audience: event.target.value as AnnouncementAudience })}
                >
                  {(Object.keys(ANNOUNCEMENT_AUDIENCE) as AnnouncementAudience[]).map((audience) => (
                    <option key={audience} value={audience}>
                      {ANNOUNCEMENT_AUDIENCE[audience]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="ตั้งเวลาส่ง" hint="เว้นว่างไว้ = ส่งทันทีเมื่อกดปุ่ม">
              <Input
                value={editing.scheduledFor}
                onChange={(event) => setEditing({ ...editing, scheduledFor: event.target.value })}
                placeholder="15 ส.ค. 2026 18:00 น."
              />
            </Field>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(sendTarget)}
        onClose={() => setSendTarget(null)}
        onConfirm={() => toast({ tone: "success", message: `ส่งประกาศ “${sendTarget?.title}” แล้ว` })}
        title="ส่งประกาศนี้ทันที?"
        description={`ประกาศจะไปถึง ${ANNOUNCEMENT_AUDIENCE[sendTarget?.audience ?? "all"]} ผ่าน${ANNOUNCEMENT_CHANNEL[sendTarget?.channel ?? "banner"]} ทันที และยกเลิกการส่งย้อนหลังไม่ได้`}
        confirmLabel="ส่งเลย"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => toast({ tone: "error", message: `ลบประกาศ “${deleteTarget?.title}” แล้ว` })}
        title={`ลบประกาศ “${deleteTarget?.title ?? ""}”?`}
        description="ถ้าประกาศนี้ยังแสดงอยู่บนเว็บ จะถูกเอาออกทันทีที่ลบ"
        confirmLabel="ลบประกาศ"
        tone="danger"
      />
    </div>
  );
}
