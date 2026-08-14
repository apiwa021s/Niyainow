import type { Metadata } from "next";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { UsersView } from "@/components/admin/views/users-view";
import { members } from "@/data/admin-data";
import type { MemberQuery } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "สมาชิก",
  description: "ค้นหาสมาชิก ปรับเหรียญ และจัดการสถานะบัญชี"
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<MemberQuery> }) {
  const query = await searchParams;

  const active = members.filter((member) => member.status === "active").length;
  const suspended = members.filter((member) => member.status !== "active").length;
  const paying = members.filter((member) => member.spentTHB > 0).length;

  return (
    <>
      <AdminPageHeader
        title="สมาชิก"
        description="ดูข้อมูลบัญชี ปรับเหรียญ และจัดการผู้ใช้ที่มีปัญหา"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "สมาชิก" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="บัญชีในหน้านี้" value={members.length} unit="บัญชี" hint="ชุดข้อมูลตัวอย่าง" />
        <StatCard label="ใช้งานปกติ" value={active} unit="บัญชี" />
        <StatCard label="ถูกระงับ/แบน" value={suspended} unit="บัญชี" hint="ต้องทบทวนทุกเดือน" />
        <StatCard label="เคยเติมเหรียญ" value={paying} unit="บัญชี" />
      </div>

      <UsersView initialQuery={query} />
    </>
  );
}
