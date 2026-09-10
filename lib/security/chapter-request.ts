import "server-only";

import { assessChapterRequest } from "@/lib/security/abuse-detection";
import { resolveRequestIdentity } from "@/lib/security/request-identity";
import type { RequestIdentity } from "@/lib/security/request-identity";
import { recordSecurityEvent } from "@/lib/security/security-events";

export async function inspectChapterRequest(input: {
  request: Request;
  identity?: RequestIdentity;
  userId?: string | null;
  novelId: string;
  chapterNumber: number;
  chapterId?: string;
}) {
  const identity = input.identity ?? resolveRequestIdentity(input.request, input.userId);
  const risk = await assessChapterRequest({
    request: input.request,
    identity,
    novelId: input.novelId,
    chapterNumber: input.chapterNumber,
  });
  if (risk.riskLevel !== "LOW") {
    await recordSecurityEvent({
      event: risk.allowed ? "SCRAPING_SUSPECTED" : "RATE_LIMIT",
      subjectHash: identity.subjectHash,
      ipHash: identity.ipHash,
      chapterId: input.chapterId,
      novelId: input.novelId,
      result: risk.allowed ? "ALLOWED_WITH_RISK" : "RATE_LIMITED",
      riskLevel: risk.riskLevel,
      score: risk.score,
    });
  }
  return { identity, risk };
}
