type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

const MAX_LOCAL_KEYS = 10_000;
const localWindows = new Map<string, RateLimitEntry>();

/**
 * A bounded, process-local first line of defence. The call site is intentionally
 * provider-neutral so a distributed implementation can replace it when the app
 * runs on multiple write instances.
 */
export function takeRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = localWindows.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  entry.count += 1;
  localWindows.set(key, entry);

  if (localWindows.size > MAX_LOCAL_KEYS) {
    for (const [candidate, value] of localWindows) {
      if (value.resetAt <= now) localWindows.delete(candidate);
      if (localWindows.size <= MAX_LOCAL_KEYS) break;
    }
    if (localWindows.size > MAX_LOCAL_KEYS) {
      localWindows.delete(localWindows.keys().next().value as string);
    }
  }

  return {
    allowed: entry.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Behind Cloudflare, CF-Connecting-IP is the only client address a caller
 * cannot forge; the x-forwarded-for chain is attacker-controlled at the edge.
 */
export function clientIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || forwarded
    || "unknown";
}

export function requestRateLimitKey(request: Request, scope: string, subject?: string) {
  return `${scope}:${subject || clientIpAddress(request)}`;
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1_000)),
    ...(result.allowed ? {} : { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1_000))) }),
  };
}
