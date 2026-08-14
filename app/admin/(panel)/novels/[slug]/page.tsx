import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileStack, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NovelFormView } from "@/components/admin/views/novel-form-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminNovel, getAdminReferenceData } from "@/services/admin-service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const novel = await getAdminNovel((await params).slug);
  return { title: novel ? `แก้ไข ${novel.title}` : "ไม่พบนิยาย" };
}
export default async function AdminNovelPage({ params }: Props) {
  const { slug } = await params;
  const [novel, references] = await Promise.all([getAdminNovel(slug), getAdminReferenceData()]);
  if (!novel) notFound();
  return <>
    <AdminPageHeader title={novel.title} description={`slug คงที่: ${novel.slug}`} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย", href: "/admin/novels" }, { label: novel.title }]} actions={<><ButtonLink href={`/admin/novels/${novel.slug}/chapters`} variant="outline"><FileStack className="h-4 w-4" />จัดการตอน</ButtonLink><ButtonLink href={`/admin/novels/${novel.slug}/chapters/new`}><Plus className="h-4 w-4" />เพิ่มตอน</ButtonLink></>} />
    <NovelFormView novel={novel} references={references} />
  </>;
}
