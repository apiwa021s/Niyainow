"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { safeLoginCallback, safeRedirectPath } from "@/lib/auth/redirects";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

function redirectToLoginError(error: string, callbackUrl: string): never {
  redirect(`/login?${new URLSearchParams({ error, callbackUrl })}`);
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const redirectTo = safeLoginCallback(formData.get("callbackUrl"), "/profile");

  const token = formData.get("cf-turnstile-response");
  const requestHeaders = await headers();
  const ip = requestHeaders.get("cf-connecting-ip")
    ?? requestHeaders.get("x-real-ip")
    ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const limit = await takeDistributedRateLimit(`auth:google:${ip}`, { limit: 12, windowMs: 10 * 60_000 });
  if (!limit.allowed) redirectToLoginError("rate_limited", redirectTo);
  const verified = await verifyTurnstileToken(typeof token === "string" ? token : null, ip);
  if (!verified) redirectToLoginError("captcha", redirectTo);

  await signIn(
    "google",
    { redirectTo },
    {
      prompt: "select_account",
    },
  );
}

export async function signOutUser(formData?: FormData): Promise<void> {
  const redirectTo = safeRedirectPath(formData?.get("callbackUrl"), "/");
  await signOut({ redirectTo });
}
