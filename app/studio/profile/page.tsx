"use client";

import { useState } from "react";

import {
  ResumeWritingCard,
  StudioPageError,
  StudioPageSkeleton,
  StudioPageStateBar,
  WriterProfileEditor,
} from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export default function StudioProfilePage() {
  const [state, setState] = useState<"normal" | "loading" | "error" | "empty" | "no-data">("normal");

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / โปรไฟล์นักเขียน"
        title="โปรไฟล์นักเขียน"
        description="นี่คือพื้นที่ที่คนอ่านใช้ทำความรู้จักคุณและผลงานของคุณ"
      />

      <StudioPageStateBar state={state} onStateChange={setState} />

      {state === "loading" ? (
        <div className="grid gap-3">
          <StudioPageSkeleton />
          <StudioPageSkeleton />
        </div>
      ) : null}

      {state === "error" ? <StudioPageError onRetry={() => setState("normal")} /> : null}

      {state === "empty" ? (
        <section className="rounded-xl border border-border bg-card p-5 text-center">
          <h2 className="font-semibold">ยังไม่มีข้อมูลโปรไฟล์</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เริ่มจากเพิ่มรูปโปรไฟล์และ Bio เพื่อให้คนอ่านรู้จักคุณมากขึ้น</p>
        </section>
      ) : null}

      {state === "no-data" ? (
        <section className="rounded-xl border border-border bg-card p-5 text-center">
          <h2 className="font-semibold">ยังไม่มีเรื่องสำหรับแนะนำ</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">สร้างหรือเผยแพร่เรื่องแรกก่อน แล้วค่อยเลือกเป็นเรื่องแนะนำ</p>
        </section>
      ) : null}

      {state === "normal" ? (
        <div className="grid gap-4">
          <WriterProfileEditor />
          <ResumeWritingCard />
        </div>
      ) : null}
    </div>
  );
}
