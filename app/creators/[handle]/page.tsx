import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WriterProfileView } from "@/components/creators/writer-profile-view";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { getWriterProfile } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getWriterProfile(handle);
  return pageMetadata({
    title: profile ? `${profile.name} · นักเขียน NovelNow` : "ไม่พบนักเขียน",
    description: profile?.bio ?? `ผลงานของ ${profile?.name ?? "นักเขียน"} บน NovelNow`,
    path: `/creators/${handle}`,
    noIndex: !profile,
  });
}

export default async function WriterProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getWriterProfile(handle);
  if (!profile) notFound();

  return (
    <PageShell className="max-w-5xl">
      <WriterProfileView profile={profile} />
    </PageShell>
  );
}
