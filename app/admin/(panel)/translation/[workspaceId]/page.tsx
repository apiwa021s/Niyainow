import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationWorkspaceView } from "@/components/admin/views/translation-workspace-view";
import { requireAdmin } from "@/lib/auth/dal";
import { getTranslationWorkspace } from "@/services/translation-service";

export const metadata: Metadata = { title: "Translation Workspace" };

export default async function TranslationWorkspacePage({ params }: PageProps<"/admin/translation/[workspaceId]">) {
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
