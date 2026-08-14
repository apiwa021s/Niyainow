import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ReviewModerationView } from "@/components/admin/views/review-moderation-view";
import { getAdminReviews, type AdminReviewQuery } from "@/services/admin-service";

export const metadata: Metadata = { title: "ตรวจรีวิว" };

export default async function ReviewModerationPage({ searchParams }: { searchParams: Promise<AdminReviewQuery> }) {
  const incoming = await searchParams;
  const query: AdminReviewQuery = { ...incoming, status: incoming.status || "PENDING" };
  const result = await getAdminReviews(query);
  return <>
    <AdminPageHeader title="ตรวจรีวิว" description="อนุมัติ ปฏิเสธ หรือซ่อนรีวิวผู้อ่านจากคิว moderation จริง" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ตรวจรีวิว" }]} />
    <ReviewModerationView result={result} query={query} />
  </>;
}
