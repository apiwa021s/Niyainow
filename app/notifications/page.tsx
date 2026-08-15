import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "แจ้งเตือน", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireActiveUser("/notifications");
  const summary = await getProfileSummary(user.id);
  return (
    <PageShell className="space-y-5">
      <SectionHeader title="แจ้งเตือน" />
      <NotificationsPanel followingCount={summary.followingCount} />
    </PageShell>
  );
}
