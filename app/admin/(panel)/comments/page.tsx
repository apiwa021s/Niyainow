import type { Metadata } from "next";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { CommentsView } from "@/components/admin/views/comments-view";
import { getCommentStatusCounts, type CommentQuery } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "คอมเมนต์",
  description: "ตรวจสอบ อนุมัติ และซ่อนคอมเมนต์ของผู้อ่าน"
};

export default async function AdminCommentsPage({
  searchParams
}: {
  searchParams: Promise<CommentQuery & { reported?: string }>;
}) {
  const query = await searchParams;
  const counts = getCommentStatusCounts();

  return (
    <>
      <AdminPageHeader
        title="คอมเมนต์"
        description="คิวตรวจคอมเมนต์ — เริ่มจากรายการที่ถูกรายงานและที่รอตรวจก่อน"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "คอมเมนต์" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="รอตรวจ" value={counts.pending ?? 0} unit="รายการ" hint="ควรเคลียร์ภายใน 24 ชม." />
        <StatCard label="แสดงอยู่" value={counts.visible ?? 0} unit="รายการ" />
        <StatCard label="ซ่อนแล้ว" value={counts.hidden ?? 0} unit="รายการ" />
        <StatCard label="สแปม" value={counts.spam ?? 0} unit="รายการ" hint="ระบบตรวจจับอัตโนมัติ" />
      </div>

      <CommentsView initialQuery={query} />
    </>
  );
}
