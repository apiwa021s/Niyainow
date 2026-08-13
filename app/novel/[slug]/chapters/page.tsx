import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageShell, SectionHeader } from "@/components/ui/section";
import { getChapters, getNovelBySlug } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  return { title: novel ? `สารบัญ ${novel.thaiTitle}` : "สารบัญ" };
}

export default async function ChaptersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = getNovelBySlug(slug);
  if (!novel) notFound();
  const chapters = getChapters(slug);
  return (
    <PageShell className="space-y-5">
      <SectionHeader title={`สารบัญ ${novel.thaiTitle}`} />
      <div className="grid gap-2">
        {chapters.map((chapter) => (
          <Link key={chapter.number} href={`/novel/${slug}/chapter/${chapter.number}`} className="grid gap-1 rounded-lg border border-border bg-card p-4 hover:bg-muted sm:grid-cols-[120px_1fr_auto]">
            <span className="font-mono text-sm text-[var(--brand-accent)]">ตอนที่ {chapter.number}</span>
            <span>{chapter.title}</span>
            <span className="text-sm text-muted-foreground">{chapter.updatedAt}</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
