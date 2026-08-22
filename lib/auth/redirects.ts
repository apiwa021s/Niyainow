const REDIRECT_BASE = new URL("https://niyainow.invalid");

/**
 * Accept only same-origin path redirects. OAuth callback targets originate from
 * request data, so protocol-relative and absolute URLs must fail closed.
 */
export function safeRedirectPath(value: FormDataEntryValue | string | null | undefined, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const target = new URL(value, REDIRECT_BASE);
    if (target.origin !== REDIRECT_BASE.origin) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function safeLoginCallback(
  value: FormDataEntryValue | string | null | undefined,
  fallback: string,
) {
  const path = safeRedirectPath(value, fallback);
  if (/^\/(?:login|admin\/login)(?:\/|$|\?)/u.test(path)) return fallback;
  return path;
}
