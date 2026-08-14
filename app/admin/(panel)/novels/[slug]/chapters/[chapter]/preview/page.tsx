import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader, Panel } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { getAdminChapter, getAdminNovel } from "@/services/admin-service";

export const metadata: Metadata = { title: "ตัวอย่างตอน" };

export default async function ChapterPreviewPage({ params }: { params: Promise<{ slug: string; chapter: string }> }) {
  const { slug, chapter: number } = await params;
  const [novel, chapter] = await Promise.all([getAdminNovel(slug), getAdminChapter(slug, number)]);
  if (!novel || !chapter) notFound();
  const paragraphs = chapter.content.split(/\n\s*\n/gu).map((item) => item.trim()).filter(Boolean);
  return <><AdminPageHeader title={`ตัวอย่างตอน ${chapter.chapterNumber}`} description={`${novel.title} · ตัวอย่างเฉพาะผู้ดูแล ไม่ขึ้นหน้าสาธารณะจนกว่าจะเผยแพร่`} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: novel.title, href: `/admin/novels/${novel.slug}` }, { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` }, { label: String(chapter.chapterNumber), href: `/admin/novels/${novel.slug}/chapters/${chapter.chapterNumber}` }, { label: "ตัวอย่าง" }]} actions={<ButtonLink href={`/admin/novels/${novel.slug}/chapters/${chapter.chapterNumber}`} variant="outline">กลับไปแก้ไข</ButtonLink>} /><Panel><article className="mx-auto max-w-3xl rounded-[12px] bg-[var(--reader-bg)] p-6 text-[var(--reader-text)] sm:p-10"><h2 className="mb-8 text-center text-2xl font-bold">ตอน {chapter.chapterNumber}: {chapter.title}</h2>{paragraphs.map((paragraph, index) => <p key={index} className="mb-5 text-[17px] leading-[1.95] last:mb-0">{paragraph}</p>)}{!paragraphs.length ? <p className="text-center text-sm opacity-70">ตอนนี้ยังไม่มีเนื้อหา</p> : null}</article></Panel></>;
}
