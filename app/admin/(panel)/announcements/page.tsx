import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { AnnouncementsView } from "@/components/admin/views/announcements-view";

export const metadata: Metadata = {
  title: "ประกาศและแจ้งเตือน",
  description: "สร้างและตั้งเวลาประกาศถึงผู้อ่านทุกช่องทาง"
};

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="ประกาศและแจ้งเตือน"
        description="ส่งข่าวถึงผู้อ่านผ่านแถบประกาศ ป๊อปอัป แจ้งเตือนมือถือ หรืออีเมล — ส่งแล้วยกเลิกย้อนหลังไม่ได้"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ประกาศและแจ้งเตือน" }]}
      />
      <AnnouncementsView initialStatus={status} />
    </>
  );
}
