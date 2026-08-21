import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoryPricingSettings } from "@/components/studio/settings/story-pricing-settings";
import { studioWorks } from "@/components/studio/mock-data";

export const metadata: Metadata = { title: "จัดการราคา" };

export default async function StoryPricingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  return (
    <div className="grid gap-5">
      <Link
        href={`/studio/works/${work.slug}`}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {work.title}
      </Link>
      <h1 className="text-h1 font-semibold">จัดการราคา</h1>
      <StoryPricingSettings work={work} />
    </div>
  );
}
