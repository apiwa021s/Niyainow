import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { auth } from "@/auth";
import { can, canAccessAdmin, isActiveUser, type TranslationPermission } from "@/lib/auth/permissions";
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

  // Database sessions already load the user through the Auth.js adapter. The
  // session callback copies the authorization fields, so querying users again
  // here doubles the DB work on every personalized request without adding a
  // fresher authorization boundary.
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
    status: session.user.status,
  };
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

/** DB-authoritative capability check for sensitive translation mutations. */
export async function assertTranslationPermission(permission: TranslationPermission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationRequiredError();
  if (!can(user, permission)) throw new AuthorizationDeniedError();
  return user;
}
