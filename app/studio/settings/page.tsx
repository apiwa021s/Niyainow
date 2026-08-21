import type { Metadata } from "next";

import { ResumeWritingCard, WriterSettingsLayout } from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export const metadata: Metadata = { title: "ตั้งค่านักเขียน" };

export default function StudioSettingsPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow="Studio / การตั้งค่า"
        title="การตั้งค่า"
        description="ปรับค่าการเขียน การแจ้งเตือน และความเป็นส่วนตัวของคุณ"
      />

      <div className="grid gap-4">
        <WriterSettingsLayout />
        <ResumeWritingCard />
      </div>
    </>
  );
}
