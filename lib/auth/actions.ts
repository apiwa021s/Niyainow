"use server";

import { signIn, signOut } from "@/auth";
import { safeRedirectPath } from "@/lib/auth/redirects";

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const redirectTo = safeRedirectPath(formData.get("callbackUrl"), "/profile");

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
