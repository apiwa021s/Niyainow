import type { Metadata } from "next";
import { ProfilePanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "โปรไฟล์" };

export default function ProfilePage() {
  return <PageShell className="space-y-5"><SectionHeader title="โปรไฟล์" /><ProfilePanel /></PageShell>;
}
