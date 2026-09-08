import { createHash, timingSafeEqual } from "node:crypto";

function tokenDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function hasValidNovelImportAuthorization(request: Request, expectedToken: string) {
  const match = /^Bearer ([^\s]+)$/u.exec(request.headers.get("authorization") ?? "");
  if (!match) return false;
  return timingSafeEqual(tokenDigest(match[1]), tokenDigest(expectedToken));
}
