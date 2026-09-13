import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TranslationEditorView } from "@/components/admin/views/translation-editor-view";
import { Skeleton } from "@/components/ui/section";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getTranslationChapterEditor } from "@/services/translation-service";

export const metadata: Metadata = { title: "ตรวจและแก้คำแปล" };

type TranslationEditorPageProps = PageProps<"/admin/translation/[workspaceId]/chapters/[chapterId]">;

async function TranslationEditorContent({ params }: TranslationEditorPageProps) {
  const [{ workspaceId, chapterId }, user] = await Promise.all([params, requireAdmin()]);
  const data = await getTranslationChapterEditor(workspaceId, chapterId);
  if (!data) notFound();
  return <TranslationEditorView key={data.latestVersion?.id ?? `empty-${data.chapter.lockVersion}`} data={data} canPublish={can(user, "translation.publish")} />;
}

function TranslationEditorFallback() {
  return (
    <div className="grid gap-5" aria-label="กำลังโหลด Translation Editor">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[520px] rounded-[16px]" />
        <Skeleton className="h-[520px] rounded-[16px]" />
      </div>
    </div>
  );
}

export default function TranslationEditorPage(props: TranslationEditorPageProps) {
  return (
    <Suspense fallback={<TranslationEditorFallback />}>
      <TranslationEditorContent {...props} />
    </Suspense>
  );
}
