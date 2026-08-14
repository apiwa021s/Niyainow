import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageShell, SectionHeader } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-config";
import { getChapterPage, getNovelBySlug } from "@/services/novel-service";
import { parsePositivePage } from "@/types/novel-query";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const novel = await getNovelBySlug(slug);
  const pageNumber = parsePositivePage(page);
  if (!novel) return pageMetadata({ title: "สารบัญ", description: "ไม่พบนิยายเรื่องนี้", path: `/novel/${slug}/chapters`, noIndex: true });
  return pageMetadata({
    title: `สารบัญ ${novel.thaiTitle}${pageNumber > 1 ? ` หน้า ${pageNumber}` : ""}`,
    description: `รายชื่อตอนที่เผยแพร่ของ ${novel.thaiTitle}`,
    path: `/novel/${novel.slug}/chapters${pageNumber > 1 ? `?page=${pageNumber}` : ""}`,
  });
}

export default async function ChaptersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page }] = await Promise.all([params, searchParams]);
  const requestedPage = parsePositivePage(page);
  const [novel, chapterPage] = await Promise.all([
    getNovelBySlug(slug),
    getChapterPage(slug, requestedPage),
  ]);
  if (!novel) notFound();
  if (requestedPage !== chapterPage.page) {
    redirect(`/novel/${slug}/chapters${chapterPage.page > 1 ? `?page=${chapterPage.page}` : ""}`);
  }

  return (
    <PageShell className="space-y-5">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `สารบัญ ${novel.thaiTitle}`,
          numberOfItems: chapterPage.total,
          itemListElement: chapterPage.items.map((chapter, index) => ({
            "@type": "ListItem",
            position: (chapterPage.page - 1) * chapterPage.pageSize + index + 1,
            name: `ตอนที่ ${chapter.number}: ${chapter.title}`,
            url: absoluteUrl(`/novel/${slug}/chapter/${chapter.number}`),
          })),
        }}
      />
      <SectionHeader title={`สารบัญ ${novel.thaiTitle}`} />
      {chapterPage.items.length > 0 ? (
        <div className="grid gap-2">
          {chapterPage.items.map((chapter) => (
            <Link
              key={chapter.id ?? chapter.number}
              href={`/novel/${slug}/chapter/${chapter.number}`}
              className="grid gap-1 rounded-lg border border-border bg-card p-4 hover:bg-muted sm:grid-cols-[120px_1fr_auto]"
            >
              <span className="font-mono text-sm text-[var(--brand-accent)]">ตอนที่ {chapter.number}</span>
              <span>{chapter.title}</span>
              <span className="text-sm text-muted-foreground">{chapter.updatedAt}</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="ยังไม่มีตอนที่เผยแพร่" description="กลับมาดูใหม่เมื่อนักเขียนเผยแพร่ตอนแรก" />
      )}
      {chapterPage.totalPages > 1 ? (
        <nav aria-label="แบ่งหน้าสารบัญ" className="flex items-center justify-center gap-3">
          {chapterPage.page > 1 ? <ButtonLink href={`/novel/${slug}/chapters${chapterPage.page > 2 ? `?page=${chapterPage.page - 1}` : ""}`} variant="outline">หน้าก่อน</ButtonLink> : null}
          <span className="tabular text-sm text-muted-foreground">หน้า {chapterPage.page} / {chapterPage.totalPages}</span>
          {chapterPage.page < chapterPage.totalPages ? <ButtonLink href={`/novel/${slug}/chapters?page=${chapterPage.page + 1}`} variant="outline">หน้าถัดไป</ButtonLink> : null}
        </nav>
      ) : null}
    </PageShell>
  );
}
