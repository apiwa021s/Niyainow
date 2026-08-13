import type { Metadata } from "next";
import { NotificationsPanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "แจ้งเตือน" };

export default function NotificationsPage() {
  return <PageShell className="space-y-5"><SectionHeader title="แจ้งเตือน" /><NotificationsPanel /></PageShell>;
}
