"use client";

import { useState } from "react";

import {
  MyStoriesGrid,
  ResumeWritingCard,
  StudioPageError,
  StudioPageSkeleton,
  StudioPageStateBar,
} from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export default function StudioStoriesPage() {
  const [state, setState] = useState<"normal" | "loading" | "error" | "empty" | "no-data">("normal");

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / ผลงานของฉัน"
        title="ผลงานของฉัน"
        description="จัดการทุกเรื่องของคุณในมุมมองเดียว แล้วกลับไปเขียนต่อได้ทันที"
        action={<ButtonLink href="/studio/works/new">+ สร้างเรื่องใหม่</ButtonLink>}
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
        <section className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-semibold">เรื่องแรกของคุณเริ่มได้จากตรงนี้ ✦</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">สร้างเรื่องใหม่ และเริ่มพาคนอ่านเข้าสู่โลกที่คุณกำลังเขียน</p>
          <ButtonLink href="/studio/works/new" className="mt-4">+ สร้างเรื่องแรก</ButtonLink>
        </section>
      ) : null}

      {state === "no-data" ? (
        <section className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-semibold">ยังไม่มีสถิติยอดอ่านหรือรายได้</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เมื่อเผยแพร่ตอนแรกแล้ว ตัวเลขจะปรากฏในแต่ละการ์ดของเรื่อง</p>
        </section>
      ) : null}

      {state === "normal" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <MyStoriesGrid />
          <div className="grid content-start gap-4">
            <ResumeWritingCard compactMode />
          </div>
        </div>
      ) : null}
    </div>
  );
}
