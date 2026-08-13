import type { Metadata } from "next";
import { AuthForm } from "@/components/interactive/auth-form";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default function LoginPage() {
  return <PageShell><AuthForm mode="login" /></PageShell>;
}
