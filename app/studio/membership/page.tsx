"use client";

import { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";

import {
  MembershipEmptyState,
  MembershipOverview,
  MembershipSetupWizard,
  ResumeWritingCard,
  StudioPageError,
  StudioPageSkeleton,
  StudioPageStateBar,
} from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function StudioMembershipPage() {
  const [state, setState] = useState<"normal" | "loading" | "error" | "empty" | "no-data">("normal");
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState(false);
  const { toast } = useToast();

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / Membership"
        title="Membership"
        description="พื้นที่พิเศษสำหรับแฟนที่อยากสนับสนุนคุณมากขึ้น"
      />

      <StudioPageStateBar state={state} onStateChange={setState} />

      {state === "loading" ? (
        <div className="grid gap-3">
          <StudioPageSkeleton />
          <StudioPageSkeleton />
        </div>
      ) : null}

      {state === "error" ? <StudioPageError onRetry={() => setState("normal")} /> : null}

      {state === "no-data" ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">ยังไม่มีข้อมูลสมาชิก</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เมื่อเปิด Membership แล้ว ระบบจะแสดงแนวโน้มสมาชิกให้ที่นี่</p>
        </section>
      ) : null}

      {(state === "normal" || state === "empty") ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid content-start gap-4">
            {!enabled && !setup ? (
              <MembershipEmptyState onStart={() => setSetup(true)} />
            ) : null}

            {!enabled && setup ? (
              <MembershipSetupWizard
                onEnable={() => {
                  setEnabled(true);
                  setSetup(false);
                  toast({
                    tone: "success",
                    message: "Membership เปิดแล้ว",
                    action: { label: "เขียนตอนใหม่", onClick: () => {} },
                  });
                }}
              />
            ) : null}

            {enabled ? <MembershipOverview /> : null}

            {enabled ? (
              <section className="rounded-xl border border-border bg-card p-5">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-500">
                  <CheckCircle2 aria-hidden className="h-4 w-4" />
                  Membership เปิดแล้ว
                </p>
                <p className="mt-2 text-sm text-(--text-secondary)">ต่อไปคุณสามารถสร้างตอนสำหรับสมาชิกหรือ Early Access ได้</p>
                <ButtonLink href="/studio/works/reborn-as-a-warlord/chapters/new" className="mt-4">
                  <Plus aria-hidden className="h-4 w-4" />
                  เขียนตอนใหม่
                </ButtonLink>
              </section>
            ) : null}
          </div>

          <div className="grid content-start gap-4">
            <ResumeWritingCard compactMode />
          </div>
        </div>
      ) : null}
    </div>
  );
}
