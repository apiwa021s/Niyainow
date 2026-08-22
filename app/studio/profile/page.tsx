import type { Metadata } from "next";

import { WriterProfileForm } from "@/components/studio/profile/writer-profile-form";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterProfileEditorData } from "@/services/studio-service";

export const metadata: Metadata = { title: "โปรไฟล์นักเขียน" };

export default async function StudioProfilePage() {
  const user = await requireActiveUser("/studio/profile");
  const data = await getWriterProfileEditorData(user.id);

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / โปรไฟล์นักเขียน"
        title={data.profile ? "โปรไฟล์นักเขียน" : "เริ่มต้นสตูดิโอของคุณ"}
        description={data.profile
          ? "ข้อมูลนี้คือสิ่งที่คนอ่านใช้ทำความรู้จักคุณและผลงานของคุณ"
          : "สร้างโปรไฟล์นักเขียนด้วยบัญชี NovelNow เดิม แล้วเริ่มผลงานแรกได้ทันที"}
      />
      <WriterProfileForm initialData={data} />
    </div>
  );
}
