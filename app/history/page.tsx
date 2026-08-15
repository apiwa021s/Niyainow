import type { Metadata } from "next";

import { LibraryView } from "@/components/interactive/library-view";
import { PageHeader, PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listReadingHistory } from "@/services/user-service";

export const metadata: Metadata = { title: "ประวัติการอ่าน", robots: { index: false, follow: false } };

export default async function HistoryPage() {
  const user = await requireActiveUser("/history");
  const items = await listReadingHistory(user.id);
  return <PageShell><PageHeader title="ประวัติการอ่าน" description="กลับไปยังตอนล่าสุดของแต่ละเรื่องได้ในจังหวะเดียว" /><LibraryView mode="history" items={items} /></PageShell>;
}
