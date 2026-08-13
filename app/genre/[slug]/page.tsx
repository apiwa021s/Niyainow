import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NovelBrowser } from "@/components/interactive/novel-browser";
import { PageShell } from "@/components/ui/section";
import { getGenreBySlug } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);
  return { title: genre ? `นิยาย${genre.thaiName}` : "ไม่พบหมวดหมู่" };
}

export default async function GenreDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genre = getGenreBySlug(slug);
  if (!genre) notFound();
  return (
    <PageShell className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-[var(--brand-accent)]">หมวดหมู่</p>
        <h1 className="mt-2 text-3xl font-semibold">นิยาย{genre.thaiName}</h1>
        <p className="mt-2 text-muted-foreground">{genre.description}</p>
        <p className="mt-4 text-sm text-muted-foreground">{genre.count.toLocaleString()} เรื่อง</p>
      </div>
      <NovelBrowser initialQuery={{ genre: slug }} title={`นิยาย${genre.thaiName}`} />
    </PageShell>
  );
}
