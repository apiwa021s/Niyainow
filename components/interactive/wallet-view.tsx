import { LockKeyhole } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export function WalletView() {
  return (
    <section className="mx-auto max-w-2xl border-y border-border py-8">
      <LockKeyhole className="h-7 w-7 text-muted-foreground" />
      <h1 className="mt-4 font-serif text-3xl font-semibold">ยังไม่เปิดระบบชำระเงิน</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">NiyaiThai ยังไม่มีบริการเติมเหรียญ ซื้อแพ็กเกจ หรือปลดล็อกตอน จึงไม่แสดงยอดคงเหลือและไม่มีการเรียกเก็บเงินในบัญชี</p>
      <p className="mt-3 text-sm font-medium">ระบบนี้จะเปิดเมื่อช่องทางชำระเงิน เงื่อนไขการคืนเงิน และประวัติรายการพร้อมใช้งานจริงเท่านั้น</p>
      <ButtonLink href="/novels" variant="outline" className="mt-5">กลับไปสำรวจนิยาย</ButtonLink>
    </section>
  );
}
