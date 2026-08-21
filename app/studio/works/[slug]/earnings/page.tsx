import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterEarningsList } from "@/components/studio/earnings/chapter-earnings-list";
import { EarningsEmptyState } from "@/components/studio/earnings/earnings-empty-state";
import { chapterEarningsForStory, currentRevenueContract, storyEarningsBySlug } from "@/components/studio/mock-earnings";
import { baht, studioWorks, whole } from "@/components/studio/mock-data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  return { title: work ? `รายได้ · ${work.title}` : "รายได้" };
}

/** Story earnings detail (spec §16–19). Route follows this app's existing /studio/works/:slug convention. */
export default async function StoryEarningsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const chapters = chapterEarningsForStory(slug);
  const summary = storyEarningsBySlug(slug);

  return (
    <div className="grid gap-5">
      <Link
        href={`/studio/works/${slug}`}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {work.title}
      </Link>

      <header>
        <h1 className="text-h1 font-semibold">{work.title}</h1>
        {summary ? (
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-(--text-tertiary)">รายได้เดือนนี้</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{baht.format(summary.earnings)}</p>
            </div>
            <div>
              <p className="text-xs text-(--text-tertiary)">ปลดล็อก</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{whole.format(summary.unlocks)} ครั้ง</p>
            </div>
          </div>
        ) : null}
      </header>

      {chapters.length === 0 ? (
        <EarningsEmptyState hasPaidChapters={work.defaultAccess === "paid"} />
      ) : (
        <ChapterEarningsList chapters={chapters} sharePercent={currentRevenueContract.creatorSharePercent} />
      )}
    </div>
  );
}
