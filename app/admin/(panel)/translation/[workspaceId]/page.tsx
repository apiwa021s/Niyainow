import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationWorkspaceView } from "@/components/admin/views/translation-workspace-view";
import { Skeleton } from "@/components/ui/section";
import { requireAdmin } from "@/lib/auth/dal";
import { getTranslationWorkspace } from "@/services/translation-service";

export const metadata: Metadata = { title: "Translation Workspace" };

type TranslationWorkspacePageProps = PageProps<"/admin/translation/[workspaceId]">;

async function TranslationWorkspaceContent({ params }: TranslationWorkspacePageProps) {
  const { workspaceId } = await params;
  const [data, user] = await Promise.all([getTranslationWorkspace(workspaceId), requireAdmin()]);
  if (!data) notFound();
  return (
    <>
      <AdminPageHeader
        title={data.workspace.title}
        description={`${data.workspace.sourceLanguage} → ${data.workspace.targetLanguage}`}
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "Translation Studio", href: "/admin/translation" }, { label: data.workspace.title }]}
      />
      <TranslationWorkspaceView data={data} canCancelJobs={user.role === "ADMIN"} />
    </>
  );
}

function TranslationWorkspaceFallback() {
  return (
    <div className="grid gap-5" aria-label="กำลังโหลด Translation Workspace">
      <div className="grid gap-2">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-[16px]" />)}
      </div>
      <Skeleton className="h-80 rounded-[16px]" />
    </div>
  );
}

export default function TranslationWorkspacePage(props: TranslationWorkspacePageProps) {
  return (
    <Suspense fallback={<TranslationWorkspaceFallback />}>
      <TranslationWorkspaceContent {...props} />
    </Suspense>
  );
}
