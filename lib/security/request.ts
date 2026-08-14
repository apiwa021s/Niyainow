import { ApiError } from "@/lib/http/api-response";

/** Custom cookie-authenticated mutations must originate from this application. */
export function assertSameOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (!origin || origin !== requestUrl.origin) {
    throw new ApiError(403, "INVALID_ORIGIN", "ไม่อนุญาตคำขอจากเว็บไซต์อื่น");
  }
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    throw new ApiError(403, "INVALID_FETCH_SITE", "ไม่อนุญาตคำขอข้ามเว็บไซต์");
  }
}
