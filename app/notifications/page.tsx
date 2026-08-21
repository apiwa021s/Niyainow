import type { Metadata } from "next";

import { NotificationsPanel } from "@/components/interactive/account-panels";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getUpdatesForNovels } from "@/services/novel-service";
import { getHomePersonalization, getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "การแจ้งเตือน", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireActiveUser("/notifications");
  const [summary, personalization] = await Promise.all([
    getProfileSummary(user.id),
    getHomePersonalization(user.id),
  ]);
  const updates = await getUpdatesForNovels(personalization.followedNovelSlugs, 20);
  return (
    <PageShell className="space-y-6">
      <header className="py-2 sm:py-3">
        <p className="editorial-kicker">NOTIFICATIONS</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">การแจ้งเตือน</h1>
      </header>
      <NotificationsPanel followingCount={summary.followingCount} updates={updates} />
    </PageShell>
  );
}
