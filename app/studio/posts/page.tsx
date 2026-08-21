"use client";

import { useState } from "react";

import {
  ResumeWritingCard,
  StudioPageError,
  StudioPageSkeleton,
  StudioPageStateBar,
  WriterPostList,
} from "@/components/studio/writer-studio-components";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export default function StudioPostsPage() {
  const [state, setState] = useState<"normal" | "loading" | "error" | "empty" | "no-data">("normal");

  return (
    <div>
      <StudioPageHeader
        eyebrow="Studio / โพสต์"
        title="โพสต์ถึงแฟนของคุณ"
        description="แชร์อัปเดต เบื้องหลัง และข่าวสารกับคนอ่าน"
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
          <h2 className="font-semibold">ยังไม่มีโพสต์</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">ลองบอกแฟนว่าคุณกำลังเขียนอะไรอยู่ หรือแชร์ข่าวตอนใหม่ที่กำลังจะมา ✦</p>
        </section>
      ) : null}

      {state === "no-data" ? (
        <section className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="font-semibold">ยังไม่มีสถิติการโต้ตอบ</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เมื่อโพสต์แรกเผยแพร่แล้ว คุณจะเห็นยอดหัวใจและคอมเมนต์ตรงนี้</p>
        </section>
      ) : null}

      {state === "normal" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <WriterPostList />
          <div className="grid content-start gap-4">
            <ResumeWritingCard compactMode />
          </div>
        </div>
      ) : null}
    </div>
  );
}
