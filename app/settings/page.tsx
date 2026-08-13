import type { Metadata } from "next";
import { SettingsPanel } from "@/components/interactive/account-panels";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "ตั้งค่า" };

export default function SettingsPage() {
  return <PageShell className="space-y-5"><SectionHeader title="ตั้งค่า" /><SettingsPanel /></PageShell>;
}
