"use client";

import { useState } from "react";

import {
  FanGrowthChart,
  FanList,
  FanPreferenceInsights,
  FansOverview,
  FanSourceList,
  ResumeWritingCard,
  StudioPageError,
  StudioPageSkeleton,
  StudioPageStateBar,
} from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export default function StudioFansPage() {
  const [state, setState] = useState<"normal" | "loading" | "error" | "empty" | "no-data">("normal");

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / แฟนของฉัน"
        title="แฟนของฉัน"
        description="ทำความรู้จักคนอ่านที่ติดตามผลงานของคุณ"
      />

      <StudioPageStateBar state={state} onStateChange={setState} />

      {state === "loading" ? (
        <div className="grid gap-3">
          <StudioPageSkeleton />
          <StudioPageSkeleton />
          <StudioPageSkeleton />
        </div>
      ) : null}

      {state === "error" ? <StudioPageError onRetry={() => setState("normal")} /> : null}

      {state === "empty" ? <FanList /> : null}

      {state === "no-data" ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">ยังไม่มีข้อมูลพอสำหรับ Insight</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เมื่อมีผู้ติดตามเพิ่มขึ้น ระบบจะแสดงแนวที่แฟนชอบให้โดยอัตโนมัติ</p>
        </section>
      ) : null}

      {state === "normal" ? (
        <div className="grid gap-4">
          <FansOverview />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid content-start gap-4">
              <FanGrowthChart />
              <FanSourceList />
              <FanPreferenceInsights />
              <FanList />
            </div>
            <div className="grid content-start gap-4">
              <ResumeWritingCard compactMode />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
