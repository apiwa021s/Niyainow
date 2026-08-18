import { ArrowRight, Clock3, LockKeyhole } from "lucide-react";
import Image from "next/image";

import { ButtonLink } from "@/components/ui/button";

export function WalletView() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2 sm:py-3">
      <header>
        <p className="editorial-kicker">MY WALLET</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">กระเป๋าเหรียญ</h1>
        <p className="mt-2 text-sm text-(--text-secondary)">จัดการเหรียญ NN และดูสถานะระบบชำระเงินของ NovelNow</p>
      </header>

      <section className="grid items-center gap-5 rounded-(--r-lg) bg-surface px-5 py-6 sm:grid-cols-[minmax(0,1fr)_180px] sm:px-7">
        <div>
          <p className="text-sm font-medium text-(--text-secondary)">ยอดเหรียญคงเหลือ</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums">—</p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Clock3 className="h-4 w-4" aria-hidden />
            ระบบกระเป๋าเหรียญอยู่ระหว่างเตรียมเปิดบริการ
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/wallet/top-up">
              ดูแพ็กเกจเติมเหรียญ
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/novels" variant="outline">สำรวจนิยาย</ButtonLink>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-36 sm:w-44">
          <Image
            src="/Images/Coins/nn-gold-coin.png"
            alt="เหรียญทอง NovelNow พร้อมตรา N"
            fill
            sizes="(min-width: 640px) 176px, 144px"
            className="object-contain"
          />
        </div>
      </section>

      <section className="flex gap-3 rounded-(--r-lg) bg-muted/40 p-4 text-sm leading-6 text-(--text-secondary)">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p>ขณะนี้ยังไม่มีการเรียกเก็บเงินหรือเพิ่มยอดเหรียญจริง ปุ่มชำระเงินจะเปิดเมื่อระบบยืนยันรายการและประวัติธุรกรรมพร้อมใช้งานแล้วเท่านั้น</p>
      </section>
    </div>
  );
}
