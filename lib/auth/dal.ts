import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { canAccessAdmin, isActiveUser } from "@/lib/auth/permissions";
import { safeRedirectPath } from "@/lib/auth/redirects";

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "READER" | "EDITOR" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DELETED";
};

export class AuthenticationRequiredError extends Error {
  readonly code = "AUTHENTICATION_REQUIRED";

  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  readonly code = "AUTHORIZATION_DENIED";

  constructor() {
    super("Insufficient permissions");
    this.name = "AuthorizationDeniedError";
  }
}

/** Secure request-time identity lookup. Never authorize from client state. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Session decryption is request-bound and may use Web Crypto internally.
  // Mark it once here so every authenticated route skips speculative
  // prerender attempts without duplicating connection() across pages.
  await connection();
  const session = await auth();
  if (!session?.user?.id) return null;

  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return user ?? null;
});

export async function requireActiveUser(callbackUrl = "/profile"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const safeCallbackUrl = safeRedirectPath(callbackUrl, "/profile");

  if (!user) {
    redirect(`/login?${new URLSearchParams({ callbackUrl: safeCallbackUrl })}`);
  }

  if (!isActiveUser(user)) {
    redirect("/login?error=AccountDisabled");
  }

  return user;
}

/** UX guard for protected server-rendered admin segments. */
export async function requireAdmin(callbackUrl = "/admin"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const safeCallbackUrl = safeRedirectPath(callbackUrl, "/admin");

  if (!user) {
    redirect(`/admin/login?${new URLSearchParams({ callbackUrl: safeCallbackUrl })}`);
  }

  if (!canAccessAdmin(user)) {
    redirect("/admin/login?error=AccessDenied");
  }

  return user;
}

/**
 * Non-redirecting authorization for Server Actions, Route Handlers, and DAL
 * mutations. Every privileged operation should call this close to its query.
 */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  if (!canAccessAdmin(user)) throw new AuthorizationDeniedError();
  return user;
}
