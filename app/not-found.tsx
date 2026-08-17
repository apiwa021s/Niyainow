import { ArrowLeft, Compass } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";

export default function NotFound() {
  return (
    <PageShell className="grid min-h-[68vh] place-items-center">
      <section aria-labelledby="not-found-title" className="w-full max-w-3xl border-y border-border py-10 text-center">
        <p className="tabular font-mono text-sm font-semibold text-[var(--brand-light-on-light)]">404 / PAGE NOT FOUND</p>
        <h1 id="not-found-title" className="mt-3 text-3xl font-semibold sm:text-5xl">ไม่พบหน้าที่คุณกำลังตามหา</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-muted-foreground">
          ลิงก์อาจถูกย้าย ชื่อตอนอาจเปลี่ยน หรือเนื้อหายังไม่พร้อมเผยแพร่ คุณกลับหน้าแรกหรือเลือกดูนิยายเรื่องอื่นได้ทันที
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/"><ArrowLeft aria-hidden className="h-4 w-4" />กลับหน้าแรก</ButtonLink>
          <ButtonLink href="/novels" variant="outline"><Compass aria-hidden className="h-4 w-4" />สำรวจนิยาย</ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
