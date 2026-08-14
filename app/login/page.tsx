import type { Metadata } from "next";

import { AuthForm } from "@/components/interactive/auth-form";
import { PageShell } from "@/components/ui/section";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl, "/profile");

  return (
    <PageShell>
      <AuthForm callbackUrl={callbackUrl} error={params.error} />
    </PageShell>
  );
}
