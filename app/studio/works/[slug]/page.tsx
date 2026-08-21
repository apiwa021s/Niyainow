import type { Metadata } from "next";
import { PenLine } from "lucide-react";
import { notFound } from "next/navigation";

import { ChapterManagement } from "@/components/studio/dashboard/chapter-management";
import { PerformanceChart } from "@/components/studio/dashboard/performance-chart";
import { PerformanceSummary } from "@/components/studio/dashboard/performance-summary";
import { SmartActionArea } from "@/components/studio/dashboard/smart-action-area";
import { StoryHeader } from "@/components/studio/dashboard/story-header";
import { StoryHealthCard } from "@/components/studio/dashboard/story-health-card";
import { getStudioDailyPerformance, studioChapters, studioWorks } from "@/components/studio/mock-data";
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

      {work.reads > 0 ? <PerformanceChart daily={getStudioDailyPerformance(work)} /> : null}

      <StoryHealthCard storySlug={work.slug} health={work.health} />

      {chapters.length > 0 ? <ChapterManagement storySlug={work.slug} chapters={chapters} /> : null}
    </div>
  );
}
