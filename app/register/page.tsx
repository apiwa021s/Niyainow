import type { Metadata } from "next";
import { AuthForm } from "@/components/interactive/auth-form";
import { PageShell } from "@/components/ui/section";

export const metadata: Metadata = { title: "สมัครสมาชิก" };

export default function RegisterPage() {
  return <PageShell><AuthForm mode="register" /></PageShell>;
}
