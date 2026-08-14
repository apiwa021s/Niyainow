import { Panel } from "@/components/admin/admin-ui";

export type ActivityItem = { id: string; actor: string; action: string; entityType: string; entityId: string | null; createdAt: string };

export function ActivityView({ items }: { items: ActivityItem[] }) {
  return (
    <Panel title="Audit log แบบ append-only" description="แสดงรายการล่าสุดจาก admin_audit_logs; หน้านี้ไม่มีคำสั่งแก้ไขหรือลบ">
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-3 pr-4">เวลา</th><th className="px-4 py-3">ผู้ดำเนินการ</th><th className="px-4 py-3">การกระทำ</th><th className="pl-4 py-3">เป้าหมาย</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="whitespace-nowrap py-3 pr-4 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("th-TH")}</td><td className="px-4 py-3 font-medium">{item.actor}</td><td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.action}</code></td><td className="pl-4 py-3 text-muted-foreground">{item.entityType}{item.entityId ? ` · ${item.entityId}` : ""}</td></tr>)}</tbody>
      </table></div>
      {!items.length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีรายการ audit</p> : null}
    </Panel>
  );
}
