import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/interactive/account-panels";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "การแจ้งเตือน", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireActiveUser("/notifications");
  const summary = await getProfileSummary(user.id);
  return <PageShell className="space-y-6"><header><p className="editorial-kicker">สถานะฟีเจอร์</p><h1 className="mt-1 text-3xl font-semibold">การแจ้งเตือน</h1></header><NotificationsPanel followingCount={summary.followingCount} /></PageShell>;
}
