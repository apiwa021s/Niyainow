import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { MemberDetailView } from "@/components/admin/views/member-detail-view";
import { adminComments, adminTransactions } from "@/data/admin-data";
import { getMember } from "@/services/admin-service";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const member = getMember(id);
  return { title: member ? `${member.displayName} (@${member.username})` : "ไม่พบผู้ใช้" };
}

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = getMember(id);
  if (!member) notFound();

  const transactions = adminTransactions.filter((tx) => tx.memberId === member.id).slice(0, 8);
  const comments = adminComments.filter((comment) => comment.memberId === member.id).slice(0, 5);

  return (
    <>
      <AdminPageHeader
        title={member.displayName}
        description={`@${member.username} · สมัครเมื่อ ${member.joinedAt}`}
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "สมาชิก", href: "/admin/users" },
          { label: member.displayName }
        ]}
      />
      <MemberDetailView member={member} transactions={transactions} comments={comments} />
    </>
  );
}
