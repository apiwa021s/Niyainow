import { Construction } from "lucide-react";

import { Panel } from "@/components/admin/admin-ui";
import { AdminPageHeader } from "@/components/admin/admin-ui";

export function FeatureUnavailable({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Panel>
      <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-muted text-muted-foreground">
          <Construction className="h-6 w-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description ?? "ส่วนนี้ยังไม่ได้เชื่อมต่อกับระบบ production จึงปิดการใช้งานไว้เพื่อป้องกันการแสดงผลหรือการบันทึกข้อมูลที่ไม่เป็นจริง"}
        </p>
      </div>
    </Panel>
  );
}

export function UnsupportedAdminPage({ title }: { title: string }) {
  return <>
    <AdminPageHeader title={title} description="โมดูลนี้ปิดใช้งานใน production รุ่นปัจจุบัน" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: title }]} />
    <FeatureUnavailable title={`${title} ยังไม่พร้อมใช้งาน`} />
  </>;
}
