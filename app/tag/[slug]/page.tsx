import type { Metadata } from "next";
import { NovelBrowser } from "@/components/interactive/novel-browser";
import { PageShell } from "@/components/ui/section";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Tag ${decodeURIComponent(slug)}` };
}

export default async function TagDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = decodeURIComponent(slug);
  return <PageShell><NovelBrowser initialQuery={{ tag }} title={`Tag: ${tag}`} /></PageShell>;
}
