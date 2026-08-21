import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MembershipView } from "@/components/novels/membership-view";
import { PageShell } from "@/components/ui/section";
import { getWriterMembership } from "@/lib/domain/reader-taste";
import { pageMetadata } from "@/lib/seo";
import { getNovelBySlug } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  return pageMetadata({
    title: novel ? `Membership · ${novel.thaiTitle}` : "Membership",
    description: "สมัครสมาชิกเพื่อสนับสนุนนักเขียนและอ่านตอนใหม่ก่อนใคร",
    path: `/novel/${slug}/membership`,
    noIndex: true,
  });
}

export default async function NovelMembershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = await getNovelBySlug(slug);
  if (!novel) notFound();
  const membership = getWriterMembership(novel);
  if (!membership) notFound();

  return (
    <PageShell className="max-w-3xl">
      <MembershipView
        novelSlug={novel.slug}
        novelHref={`/novel/${novel.slug}`}
        novelTitle={novel.thaiTitle}
        novelCover={novel.cover}
        author={novel.author}
        membership={membership}
      />
    </PageShell>
  );
}
