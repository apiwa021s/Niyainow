import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { WriterProfileView } from "@/components/creators/writer-profile-view";
import { JsonLd } from "@/components/seo/json-ld";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getWriterProfile } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getWriterProfile(handle);
  return pageMetadata({
    title: profile ? `${profile.name} · นักเขียน NovelNow` : "ไม่พบนักเขียน",
    description: profile?.bio ?? `ผลงานของ ${profile?.name ?? "นักเขียน"} บน NovelNow`,
    path: `/creators/${handle}`,
    canonicalPath: profile ? `/creators/${profile.slug}` : undefined,
    image: profile?.avatarUrl,
    noIndex: !profile || profile.novels.length === 0,
  });
}

export default async function WriterProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getWriterProfile(handle);
  if (!profile) notFound();
  if (handle !== profile.slug) permanentRedirect(`/creators/${profile.slug}`);

  return (
    <PageShell className="max-w-5xl">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              "@id": `${absoluteUrl(`/creators/${profile.slug}`)}#person`,
              name: profile.name,
              alternateName: profile.nativeName ?? undefined,
              description: profile.bio ?? undefined,
              image: absoluteUrl(profile.avatarUrl),
              url: absoluteUrl(`/creators/${profile.slug}`),
              mainEntityOfPage: absoluteUrl(`/creators/${profile.slug}`),
              workExample: profile.novels.map((novel) => ({
                "@type": "Book",
                name: novel.thaiTitle,
                url: absoluteUrl(`/novel/${novel.slug}`),
              })),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "หน้าแรก", item: absoluteUrl("/") },
                { "@type": "ListItem", position: 2, name: "นักเขียน", item: absoluteUrl("/creators") },
                { "@type": "ListItem", position: 3, name: profile.name, item: absoluteUrl(`/creators/${profile.slug}`) },
              ],
            },
          ],
        }}
      />
      <WriterProfileView profile={profile} />
    </PageShell>
  );
}
