export const COOKIE_CONSENT_NAME = "niyainow_cookie_consent";
export const COOKIE_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type CookieConsentRecord = {
  v: 1;
  essential: true;
  analytics: boolean;
  acceptedAt: number;
};

function readCookieValue(cookieHeader: string, name: string) {
  const prefix = `${name}=`;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

export function parseCookieConsent(cookieHeader: string): CookieConsentRecord | null {
  const raw = readCookieValue(cookieHeader, COOKIE_CONSENT_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (
      parsed
      && typeof parsed === "object"
      && parsed.v === COOKIE_CONSENT_VERSION
      && parsed.essential === true
      && typeof parsed.analytics === "boolean"
      && Number.isFinite(parsed.acceptedAt)
    ) {
      return parsed as CookieConsentRecord;
    }
  } catch {
    return null;
  }
  return null;
}

export function getCookieConsent(cookieHeader = ""): CookieConsentRecord | null {
  if (!cookieHeader && typeof document !== "undefined") {
    cookieHeader = document.cookie;
  }
  if (!cookieHeader) return null;
  return parseCookieConsent(cookieHeader);
}

export function hasAnalyticsConsent(cookieHeader = "") {
  return getCookieConsent(cookieHeader)?.analytics === true;
}

export function setCookieConsent(input: { analytics: boolean }) {
  if (typeof document === "undefined") return;
  const payload = {
    v: COOKIE_CONSENT_VERSION,
    essential: true as const,
    analytics: input.analytics,
    acceptedAt: Date.now(),
  };
  const encoded = encodeURIComponent(JSON.stringify(payload));
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  const attributes = [
    `${COOKIE_CONSENT_NAME}=${encoded}`,
    `Max-Age=${COOKIE_CONSENT_MAX_AGE_SECONDS}`,
    "Path=/",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ];
  document.cookie = attributes.join("; ");
}
