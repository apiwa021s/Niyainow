import "server-only";

import { getRuntimeEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(source: NodeJS.ProcessEnv = process.env) {
  return Boolean(getRuntimeEnv(source).TURNSTILE_SECRET_KEY);
}

/**
 * Returns true when the challenge is satisfied, and also true when no secret is
 * configured so the login flow keeps working before Turnstile is provisioned.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = getRuntimeEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    logger.error("Turnstile verification failed", { error });
    return false;
  }
}
