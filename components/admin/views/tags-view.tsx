import { Panel } from "@/components/admin/admin-ui";

export type TagAdminItem = { id: string; slug: string; name: string; description: string | null; usageCount: number; isActive: boolean };

export function TagsView({ tags }: { tags: TagAdminItem[] }) {
  return (
    <Panel title="แท็กจากฐานข้อมูล" description="สร้างแท็กใหม่ได้โดยกรอกชื่อในฟอร์มนิยาย ระบบจะสร้าง slug คงที่และนับการใช้งานใหม่ใน transaction">
      <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-3 pr-4">แท็ก</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">จำนวนเรื่อง</th><th className="pl-4 py-3">สถานะ</th></tr></thead>
        <tbody>{tags.map((tag) => <tr key={tag.id} className="border-b border-border/70 last:border-0"><td className="py-3 pr-4 font-semibold">{tag.name}</td><td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{tag.slug}</code></td><td className="tabular px-4 py-3">{tag.usageCount.toLocaleString("th-TH")}</td><td className="pl-4 py-3">{tag.isActive ? "ใช้งาน" : "ปิด"}</td></tr>)}</tbody>
      </table></div>
      {!tags.length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแท็ก</p> : null}
    </Panel>
  );
}
