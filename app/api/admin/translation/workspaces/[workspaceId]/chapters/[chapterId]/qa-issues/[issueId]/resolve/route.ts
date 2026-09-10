import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { resolveLockedGlossaryIssue, resolveLockedGlossaryIssueSchema } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string; chapterId: string; issueId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, resolveLockedGlossaryIssueSchema);
    const { workspaceId, chapterId, issueId } = await context.params;
    return NextResponse.json(await resolveLockedGlossaryIssue(workspaceId, chapterId, issueId, input));
  } catch (error) {
    return adminApiError(error, request);
  }
}
