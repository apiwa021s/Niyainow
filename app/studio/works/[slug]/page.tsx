import type { Metadata } from "next";
import { ArrowRight, PenLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChapterManagement } from "@/components/studio/dashboard/chapter-management";
import { PerformanceChart } from "@/components/studio/dashboard/performance-chart";
import { PerformanceSummary } from "@/components/studio/dashboard/performance-summary";
import { SmartActionArea } from "@/components/studio/dashboard/smart-action-area";
import { StoryHeader } from "@/components/studio/dashboard/story-header";
import { StoryHealthCard } from "@/components/studio/dashboard/story-health-card";
import { baht, getStudioDailyPerformance, studioChapters, studioWorks } from "@/components/studio/mock-data";
import { storyEarningsBySlug } from "@/components/studio/mock-earnings";
import { EmptyState } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  return { title: work?.title ?? "ผลงาน" };
}

export default async function StudioWorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  // The detailed chapter list only exists for the flagship demo story today —
  // every other mock work is treated as chapter-less rather than showing a
  // borrowed list that would obviously belong to a different story.
  const chapters = work.slug === "reborn-as-a-warlord" ? studioChapters : [];
  const earnings = storyEarningsBySlug(work.slug);

  return (
    <div className="grid gap-5">
      <StoryHeader work={work} />

      {chapters.length === 0 ? (
        <EmptyState
          icon={PenLine}
          title="เรื่องของคุณพร้อมแล้ว"
          description="เริ่มต้นด้วยตอนแรก เพื่อให้คนอ่านได้รู้จักเรื่องของคุณ"
          action={
            <ButtonLink href={`/studio/works/${work.slug}/chapters/new`} variant="primary">
              เขียนตอนแรก
            </ButtonLink>
          }
        />
      ) : (
        <SmartActionArea storySlug={work.slug} chapters={chapters} />
      )}

      <PerformanceSummary work={work} />

      {earnings && earnings.earnings > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div>
            <p className="text-xs text-(--text-tertiary)">รายได้เดือนนี้</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{baht.format(earnings.earnings)}</span>
              <span className={earnings.change >= 0 ? "text-xs font-semibold text-emerald-500" : "text-xs font-semibold text-(--text-tertiary)"}>
                {earnings.change >= 0 ? "+" : ""}
                {earnings.change.toFixed(1)}%
              </span>
            </p>
          </div>
          <Link
            href={`/studio/works/${work.slug}/earnings`}
            className="tap-target inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
          >
            ดูรายละเอียด
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </section>
      ) : null}

      {work.reads > 0 ? <PerformanceChart daily={getStudioDailyPerformance(work)} /> : null}

      <StoryHealthCard storySlug={work.slug} health={work.health} />

      {chapters.length > 0 ? <ChapterManagement storySlug={work.slug} chapters={chapters} /> : null}
    </div>
  );
}
