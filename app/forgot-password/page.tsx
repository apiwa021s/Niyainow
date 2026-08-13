import type { Metadata } from "next";
import { AuthForm } from "@/components/interactive/auth-form";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน" };

export default function ForgotPasswordPage() {
  return <PageShell><AuthForm mode="forgot" /></PageShell>;
}
