"use client";

import { RotateCcw } from "lucide-react";

export default function WorldError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid h-dvh w-full place-content-center justify-items-center bg-[#fff9ee] px-6 text-center text-[#302a2a]">
      <p className="font-mono text-[10px] font-bold tracking-[.18em] text-[#7b6253]">THE PAGE COULD NOT BE OPENED</p>
      <h1 className="mt-4 max-w-lg font-serif text-3xl">หมึกบนหน้านี้เลือนไปชั่วครู่</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-[#7b6253]">ตรวจสอบการเชื่อมต่อและฐานข้อมูล แล้วลองเปิด NovelNow Central อีกครั้ง</p>
      <button type="button" onClick={reset} className="mt-7 flex min-h-11 items-center gap-2 border-2 border-[#302a2a] bg-[#302a2a] px-5 font-semibold text-[#fff9ee] shadow-[5px_5px_0_#d8af67]"><RotateCcw size={17} /> ลองอีกครั้ง</button>
    </main>
  );
}
