import { NextResponse } from "next/server";
import { z } from "zod";

import {
  hashPublicViewer,
  publicViewDedupe,
  type PublicViewReservation,
} from "@/lib/domain/public-view";
import { ApiError, apiErrorResponse, parseJson } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { rateLimitHeaders, takeRateLimit, type RateLimitResult } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";
import { slugSchema } from "@/lib/validation/slug";
import { recordPublicView } from "@/services/novel-service";


const eventSchema = z.object({
  slug: slugSchema,
  chapterNumber: z
    .number()
    .finite()
    .min(0)
    .max(99_999_999.99)
    .refine((value) => Number.isInteger(value * 100), "Chapter number supports at most two decimal places")
    .optional(),
  clientToken: z.string().uuid().optional(),
});

const responseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function networkAddress(request: Request) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export async function POST(request: Request) {
  let reservation: PublicViewReservation | undefined;
  let limit: RateLimitResult | undefined;
  try {
    assertSameOrigin(request);
    const input = await parseJson(request, eventSchema);
    const address = networkAddress(request);
    const userAgent = request.headers.get("user-agent")?.slice(0, 512) || "unknown";
    const rateFingerprint = hashPublicViewer({ address, userAgent });
    limit = takeRateLimit(`public-view:${rateFingerprint}`, { limit: 60, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "ส่งสถิติการอ่านบ่อยเกินไป" } },
        { status: 429, headers: { ...responseHeaders, ...rateLimitHeaders(limit) } },
      );
    }

    const fingerprint = input.clientToken
      ? hashPublicViewer({ address, userAgent, clientToken: input.clientToken })
      : rateFingerprint;
    reservation = publicViewDedupe.reserve({
      fingerprint,
      slug: input.slug,
      chapterNumber: input.chapterNumber,
    });
    if (!reservation.accepted) {
      return NextResponse.json(
        { data: { recorded: false, duplicate: true } },
        { status: 202, headers: { ...responseHeaders, ...rateLimitHeaders(limit) } },
      );
    }

    const recorded = await recordPublicView({
      slug: input.slug,
      chapterNumber: input.chapterNumber,
      uniqueNovelReader: reservation.uniqueNovelReader,
    });
    if (!recorded) throw new ApiError(404, "PUBLIC_CONTENT_NOT_FOUND", "ไม่พบนิยายหรือตอนที่เผยแพร่");

    return NextResponse.json(
      { data: { recorded: true, duplicate: false } },
      { status: 202, headers: { ...responseHeaders, ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    if (reservation?.accepted) publicViewDedupe.rollback(reservation);
    if (!(error instanceof ApiError)) logger.error("Public view event failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", responseHeaders["Cache-Control"]);
    if (limit) {
      for (const [name, value] of Object.entries(rateLimitHeaders(limit))) response.headers.set(name, value);
    }
    return response;
  }
}
