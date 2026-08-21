import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChapterEditor } from "@/components/studio/editor/chapter-editor";
import { studioChapters, studioWorks } from "@/components/studio/mock-data";

export const metadata: Metadata = { title: "แก้ไขตอน" };

/** A rough age parse for the mock "2 ชม. ที่แล้ว" style strings — good enough to seed a plausible server timestamp. */
function parseAgoMs(text: string): number {
  const minutes = text.match(/(\d+)\s*นาที/);
  if (minutes) return Number(minutes[1]) * 60_000;
  const hours = text.match(/(\d+)\s*ชม/);
  if (hours) return Number(hours[1]) * 3_600_000;
  const days = text.match(/(\d+)\s*วัน/);
  if (days) return Number(days[1]) * 86_400_000;
  return 2 * 3_600_000;
}

function estimateServerSavedAt(updatedAtText: string): number {
  return Date.now() - parseAgoMs(updatedAtText);
}

export default async function EditChapterPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const chapters = work.slug === "reborn-as-a-warlord" ? studioChapters : [];
  const chapter = chapters.find((item) => item.number === Number(chapterId));
  if (!chapter) notFound();

  return (
    <ChapterEditor
      work={work}
      chapterNumber={chapter.number}
      initialTitle={chapter.title === "(ยังไม่ตั้งชื่อ)" ? "" : chapter.title}
      initialContent={`${chapter.title}\n\n(เนื้อหาตอนนี้จะโหลดจากฉบับที่บันทึกไว้ล่าสุด)`}
      serverSavedAt={estimateServerSavedAt(chapter.updatedAt)}
    />
  );
}
