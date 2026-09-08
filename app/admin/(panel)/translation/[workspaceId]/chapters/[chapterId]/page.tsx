import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TranslationEditorView } from "@/components/admin/views/translation-editor-view";
import { requireAdmin } from "@/lib/auth/dal";
import { getTranslationChapterEditor } from "@/services/translation-service";

export const metadata: Metadata = { title: "Translation Editor" };

export default async function TranslationEditorPage({ params }: PageProps<"/admin/translation/[workspaceId]/chapters/[chapterId]">) {
  const [{ workspaceId, chapterId }, user] = await Promise.all([params, requireAdmin()]);
  const data = await getTranslationChapterEditor(workspaceId, chapterId);
  if (!data) notFound();
  return <TranslationEditorView key={data.latestVersion?.id ?? `empty-${data.chapter.lockVersion}`} data={data} canPublish={user.role === "ADMIN"} />;
}
