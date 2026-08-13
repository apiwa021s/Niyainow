import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReaderView } from "@/components/reader/reader-view";
import { getAdjacentChapters, getChapter, getNovelBySlug, getSimilarNovels } from "@/services/novel-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; chapter: string }> }): Promise<Metadata> {
  const { slug, chapter } = await params;
  const novel = getNovelBySlug(slug);
  return { title: novel ? `${novel.thaiTitle} ตอนที่ ${chapter}` : "Reader" };
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter } = await params;
  const number = Number(chapter);
  const novel = getNovelBySlug(slug);
  const item = getChapter(slug, number);
  if (!novel || !item) notFound();
  const adjacent = getAdjacentChapters(slug, number);
  const similar = getSimilarNovels(slug, 6);
  return <ReaderView novel={novel} chapter={item} previous={adjacent.previous} next={adjacent.next} similar={similar} />;
}
