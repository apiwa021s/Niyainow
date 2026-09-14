import type { Metadata } from "next";

import { ProfilePanel } from "@/components/interactive/account-panels";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import { getReaderAvatar } from "@/services/reader-avatar-service";
import { getReaderClassProfile } from "@/services/reader-class-service";
import { getReaderMissionDashboard } from "@/services/reader-mission-service";
import { getReaderRpgSummary } from "@/services/reader-rpg-service";
import { getProfileSummary } from "@/services/user-service";

export const metadata: Metadata = { title: "โปรไฟล์", robots: { index: false, follow: false } };

export default async function ProfilePage() {
  const user = await requireActiveUser("/profile");
  const [summary, readerClassProfile, readerRpg, missions, avatar] = await Promise.all([
    getProfileSummary(user.id),
    getReaderClassProfile(user.id),
    getReaderRpgSummary(user.id),
    getReaderMissionDashboard(user.id),
    getReaderAvatar(user.id),
  ]);
  return (
    <PageShell className="space-y-4 sm:space-y-6">
      <header className="py-1 sm:py-2"><h1 className="text-h1 font-semibold sm:text-display">โปรไฟล์นักอ่าน</h1></header>
      <ProfilePanel
        user={user}
        summary={summary}
        readerClassProfile={readerClassProfile}
        readerRpg={readerRpg}
        missions={missions}
        avatar={avatar}
      />
    </PageShell>
  );
}
