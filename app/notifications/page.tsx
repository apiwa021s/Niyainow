import type { Metadata } from "next";

import { NotificationList } from "@/components/notifications/notification-list";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { listNotifications } from "@/services/creator-relationship-service";

export const metadata: Metadata = { title: "การแจ้งเตือน", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await requireActiveUser("/notifications");
  const initialFeed = await listNotifications(user.id, { limit: 20 });
  return (
    <PageShell className="space-y-6">
      <header className="py-2 sm:py-3">
        <p className="editorial-kicker">NOTIFICATIONS</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">การแจ้งเตือน</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          ตอนใหม่และรายการสำคัญจากบัญชีของคุณ รวมไว้ในที่เดียว
        </p>
      </header>
      <NotificationList initialFeed={initialFeed} />
    </PageShell>
  );
}
