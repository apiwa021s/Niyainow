import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isAuthorizedCronRequest(request: Request, expectedSecret: string) {
  const match = /^Bearer ([^\s]+)$/u.exec(request.headers.get("authorization") ?? "");
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(expectedSecret));
}
