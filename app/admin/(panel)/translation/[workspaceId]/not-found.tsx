import { FileQuestion } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export default function TranslationWorkspaceNotFound() {
  return (
    <section className="grid min-h-80 place-items-center rounded-[18px] border border-border bg-card p-6 text-center shadow-[var(--sh-1)]">
      <div className="grid max-w-lg justify-items-center">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground"><FileQuestion className="h-6 w-6" /></span>
        <h1 className="mt-4 text-xl font-bold">ไม่พบงานแปลหรือตอนนี้</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">รายการอาจถูกลบ ลิงก์ไม่ถูกต้อง หรือบัญชีนี้ไม่มีสิทธิ์เข้าถึง ลองเลือกงานจากหน้า AI Translation Studio อีกครั้ง</p>
        <ButtonLink href="/admin/translation" className="mt-5">กลับไปงานแปลทั้งหมด</ButtonLink>
      </div>
    </section>
  );
}
