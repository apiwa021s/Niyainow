import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MembershipPlanForm } from "@/components/studio/membership/membership-plan-form";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterMembershipEditorData } from "@/services/membership-service";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = { title: "Membership" };

export default async function StudioMembershipPage() {
  const user = await requireActiveUser("/studio/membership");
  if (!(await getWriterProfileForUser(user.id))) redirect("/studio/profile");
  const data = await getWriterMembershipEditorData(user.id);
  return <div><StudioPageHeader eyebrow="Studio / Membership" title="Membership" description="สร้างแผนรายเดือนแบบ Single Tier สำหรับแฟนที่อยากสนับสนุนคุณมากขึ้น" /><MembershipPlanForm initialPlan={data.plan} benefits={data.availableBenefits} /></div>;
}
