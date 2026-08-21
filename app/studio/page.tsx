import { Plus } from "lucide-react";

import { StudioHomeModules } from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export default function StudioDashboardPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow="Studio"
        title="ภาพรวม"
        description="Write → Publish → Grow → Connect → Earn → Write Again"
        action={
          <ButtonLink href="/studio/works/new" variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            เขียนตอนใหม่
          </ButtonLink>
        }
      />

      <StudioHomeModules />
    </>
  );
}
