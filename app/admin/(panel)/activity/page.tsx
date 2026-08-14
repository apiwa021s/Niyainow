import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ActivityView } from "@/components/admin/views/activity-view";
import { getRecentActivity } from "@/services/admin-service";

export const metadata: Metadata = { title: "Audit log" };
export default async function ActivityPage() {
  const items = await getRecentActivity(100);
  return <><AdminPageHeader title="บันทึกกิจกรรม" description="รายการล่าสุดสูงสุด 100 รายการ อ่านอย่างเดียว" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "บันทึกกิจกรรม" }]} /><ActivityView items={items} /></>;
}
