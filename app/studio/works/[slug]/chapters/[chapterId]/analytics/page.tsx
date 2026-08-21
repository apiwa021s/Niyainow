import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterAnalytics } from "@/components/studio/analytics/chapter-analytics";
import { ReaderFunnel } from "@/components/studio/analytics/reader-funnel";
import { studioChapters, studioWorks } from "@/components/studio/mock-data";

export const metadata: Metadata = { title: "สถิติตอน" };

export default async function ChapterAnalyticsPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const chapters = work.slug === "reborn-as-a-warlord" ? studioChapters : [];
  const chapter = chapters.find((item) => item.number === Number(chapterId));
  if (!chapter) notFound();

  const previous = chapters.find((item) => item.number === chapter.number - 1);
  const next = chapters.find((item) => item.number === chapter.number + 1);
  const label = `EP.${String(chapter.number).padStart(2, "0")}`;

  return (
    <div className="grid gap-5">
      <Link
        href={`/studio/works/${work.slug}`}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {work.title}
      </Link>

      <div>
        <p className="tabular-nums text-sm font-semibold text-brand-primary">{label}</p>
        <h1 className="mt-1 text-h1 font-semibold">{chapter.title}</h1>
      </div>

      <ChapterAnalytics chapter={chapter} />

      <ReaderFunnel
        previousLabel={previous ? `EP.${String(previous.number).padStart(2, "0")}` : undefined}
        previousViews={previous?.views}
        currentLabel={label}
        currentViews={chapter.views}
        currentUnlocks={chapter.unlocks}
        nextLabel={next && next.status === "published" ? `EP.${String(next.number).padStart(2, "0")}` : undefined}
        nextViews={next && next.status === "published" ? next.views : undefined}
      />
    </div>
  );
}
