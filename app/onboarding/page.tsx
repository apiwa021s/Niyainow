import type { Metadata } from "next";

import { ReaderClassOnboarding } from "@/components/onboarding/reader-class-onboarding";

export const metadata: Metadata = {
  title: "ค้นหา Reader Class ของคุณ",
  description: "เลือกแนวที่ชอบ ตอบคำถามสั้น ๆ และค้นหา Class นักอ่านของคุณบน NovelNow",
};

export default function OnboardingPage() {
  return <ReaderClassOnboarding />;
}
