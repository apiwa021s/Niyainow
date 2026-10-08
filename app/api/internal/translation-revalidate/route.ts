import { connection } from "next/server";

import { requireCronEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";
import { translationPublicationRevalidationSchema } from "@/services/translation-publication-cache";
import { invalidatePublishedTranslations } from "@/services/translation-service";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const MAX_BODY_BYTES = 24_000;

function failure(code: string, status: number) {
  return Response.json({ error: { code } }, { status, headers: privateHeaders });
}

export async function POST(request: Request) {
  await connection();
  let secret: string;
  try {
    secret = requireCronEnv().CRON_SECRET;
  } catch {
    return failure("REVALIDATION_NOT_CONFIGURED", 503);
  }
  if (!isAuthorizedCronRequest(request, secret)) return failure("UNAUTHORIZED", 401);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return failure("UNSUPPORTED_MEDIA_TYPE", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return failure("PAYLOAD_TOO_LARGE", 413);

  let value: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) return failure("PAYLOAD_TOO_LARGE", 413);
    value = JSON.parse(body);
  } catch {
    return failure("INVALID_REQUEST", 400);
  }
  const parsed = translationPublicationRevalidationSchema.safeParse(value);
  if (!parsed.success) return failure("INVALID_REQUEST", 400);

  try {
    const novelSlugs = [...new Set(parsed.data.novelSlugs)];
    await invalidatePublishedTranslations(novelSlugs.map((novelSlug) => ({ novelSlug })));
    return Response.json({ data: { invalidated: true } }, { headers: privateHeaders });
  } catch {
    logger.error("Translation cache revalidation failed", { code: "REVALIDATION_FAILED" });
    return failure("REVALIDATION_FAILED", 500);
  }
}
