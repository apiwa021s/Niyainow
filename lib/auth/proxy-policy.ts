import { canAccessAdmin, isActiveUser, type AuthorizationSubject } from "@/lib/auth/permissions";

export type ProxyAccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; login: "admin" | "reader"; error?: "AccessDenied" | "AccountDisabled" };

/**
 * Keep Proxy routing decisions pure and testable. Database-backed authorization
 * still happens in each protected DAL/API boundary.
 */
export function decideProxyAccess(
  pathname: string,
  subject: AuthorizationSubject | null | undefined,
): ProxyAccessDecision {
  // This is the public entry point that starts Google OAuth for administrators.
  // Redirecting it through the reader gate creates a two-login loop.
  if (pathname === "/admin/login") return { kind: "allow" };

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    if (!subject) return { kind: "redirect", login: "admin" };
    if (!canAccessAdmin(subject)) {
      return { kind: "redirect", login: "admin", error: "AccessDenied" };
    }
    return { kind: "allow" };
  }

  if (!subject) return { kind: "redirect", login: "reader" };
  if (!isActiveUser(subject)) {
    return { kind: "redirect", login: "reader", error: "AccountDisabled" };
  }

  return { kind: "allow" };
}
