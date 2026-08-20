"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { verifyTurnstileToken } from "@/lib/security/turnstile";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const redirectTo = safeRedirectPath(formData.get("callbackUrl"), "/profile");

  const token = formData.get("cf-turnstile-response");
  const requestHeaders = await headers();
  const ip = requestHeaders.get("cf-connecting-ip") ?? requestHeaders.get("x-real-ip");
  const verified = await verifyTurnstileToken(typeof token === "string" ? token : null, ip);
  if (!verified) redirect("/login?error=captcha");

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
