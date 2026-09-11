import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Files, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChaptersView } from "@/components/admin/views/chapters-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminChapters, getAdminNovel, type AdminChapterQuery } from "@/services/admin-service";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<AdminChapterQuery> };
export const metadata: Metadata = { title: "จัดการตอน" };

export default async function NovelChaptersPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = { ...(await searchParams), novel: slug };
  const [novel, result] = await Promise.all([getAdminNovel(slug), getAdminChapters(query)]);
  if (!novel) notFound();
  const basePath = `/admin/novels/${novel.slug}/chapters`;
  return <><AdminPageHeader title={`ตอนของ ${novel.title}`} description={`${novel.publishedChapters} ตอนเผยแพร่ จาก ${novel.totalChapters} ตอนทั้งหมด`} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย", href: "/admin/novels" }, { label: novel.title, href: `/admin/novels/${novel.slug}` }, { label: "ตอน" }]} actions={<><ButtonLink href={`/api/admin/novels/${novel.slug}/chapters/export`} variant="outline" download><Download className="h-4 w-4" />ดาวน์โหลด TXT</ButtonLink><ButtonLink href={`${basePath}/import`} variant="outline"><Files className="h-4 w-4" />นำเข้าหลายตอน</ButtonLink><ButtonLink href={`${basePath}/new`}><Plus className="h-4 w-4" />เพิ่มตอน</ButtonLink></>} /><ChaptersView result={result} query={query} basePath={basePath} fixedNovelSlug={novel.slug} /></>;
}
