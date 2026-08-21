import { ArrowRight, Clock3, History, LockKeyhole } from "lucide-react";
import Image from "next/image";

import { WalletHistoryTabs } from "@/components/interactive/wallet-history-tabs";
import { ButtonLink } from "@/components/ui/button";
import type { WalletSnapshot } from "@/services/coin-service";

export function WalletView({ wallet }: { wallet: WalletSnapshot }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2 sm:py-3">
      <header>
        <p className="editorial-kicker">MY WALLET</p>
        <h1 className="mt-1 text-h1 font-semibold sm:text-display">กระเป๋าเหรียญ</h1>
        <p className="mt-2 text-sm text-(--text-secondary)">จัดการเหรียญ NN และตรวจสอบทุกรายการของคุณ</p>
      </header>

      <section className="grid items-center gap-5 rounded-(--r-lg) bg-surface px-5 py-6 sm:grid-cols-[minmax(0,1fr)_180px] sm:px-7">
        <div>
          <p className="text-sm font-medium text-(--text-secondary)">ยอดเหรียญคงเหลือ</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums">
            {wallet.balance.toLocaleString("th-TH")} <span className="text-lg font-medium">เหรียญ</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-(--text-secondary)">
            <span>ได้รับทั้งหมด {wallet.lifetimeCredited.toLocaleString("th-TH")}</span>
            <span>ใช้ไป {wallet.lifetimeSpent.toLocaleString("th-TH")}</span>
          </div>
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

      <section aria-labelledby="wallet-history-heading" className="rounded-(--r-lg) bg-surface px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-(--text-secondary)" aria-hidden />
          <h2 id="wallet-history-heading" className="text-h2 font-semibold">ประวัติเหรียญ</h2>
        </div>
        {wallet.entries.length > 0 ? (
          <div className="mt-4">
            <WalletHistoryTabs entries={wallet.entries} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-(--text-secondary)">ยังไม่มีรายการเหรียญ เมื่อปลดล็อกตอนแล้วประวัติจะปรากฏที่นี่</p>
        )}
      </section>

      <section className="flex gap-3 rounded-(--r-lg) bg-muted/40 p-4 text-sm leading-6 text-(--text-secondary)">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p>
          <Clock3 className="mr-1 inline h-4 w-4" aria-hidden />
          ระบบปลดล็อกและประวัติเหรียญพร้อมใช้งานแล้ว ส่วนการเติมเหรียญด้วยเงินจริงยังไม่เปิดจนกว่าจะเชื่อมผู้ให้บริการชำระเงินและยืนยัน webhook ครบถ้วน
        </p>
      </section>
    </div>
  );
}
