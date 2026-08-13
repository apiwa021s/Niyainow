"use client";

import { Coins, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CoinPackage } from "@/types/novel";
import { useReaderStore } from "@/stores/use-reader-store";

/**
 * เหรียญและการเติมเงิน (ส่วนที่ 6.11) — mock ทั้งหมด ยังไม่ต่อ payment gateway
 * แสดงราคาต่อเหรียญเป็น caption เพื่อความโปร่งใสตามสเปก
 */
export function WalletView({ packages }: { packages: CoinPackage[] }) {
  const coins = useReaderStore((state) => state.coins);
  const addCoins = useReaderStore((state) => state.addCoins);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleTopUp = (pack: CoinPackage) => {
    addCoins(pack.coins + pack.bonus);
    setJustAdded(pack.id);
    window.setTimeout(() => setJustAdded(null), 2400);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* การ์ดยอดเหรียญ */}
      <section
        aria-label="ยอดเหรียญคงเหลือ"
        className="rounded-[24px] bg-[image:var(--grad-primary)] p-6 text-white shadow-[var(--sh-brand)]"
      >
        <p className="text-sm opacity-85">เหรียญคงเหลือ</p>
        <p className="tabular mt-1 flex items-center gap-2 text-4xl font-bold">
          <Coins className="h-8 w-8" />
          {coins.toLocaleString("th-TH")}
        </p>
        <p className="mt-2 text-sm opacity-85">ใช้ปลดล็อกตอนพิเศษได้ทุกเรื่องบน NiyaiNow</p>
      </section>

      {/* แพ็กเกจ */}
      <section aria-label="แพ็กเกจเติมเหรียญ" className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">เติมเหรียญ</h1>
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {packages.map((pack) => {
            const total = pack.coins + pack.bonus;
            const perCoin = (pack.priceTHB / total).toFixed(2);
            const added = justAdded === pack.id;

            return (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => handleTopUp(pack)}
                  className={cn(
                    "flex w-full flex-col items-center gap-1 rounded-[16px] border p-4 text-center transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--sh-2)]",
                    pack.bestValue ? "border-transparent bg-[image:var(--grad-hot)] bg-origin-border text-white" : "border-border bg-card"
                  )}
                >
                  {pack.bestValue ? (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">คุ้มที่สุด</span>
                  ) : null}
                  <span className="tabular text-2xl font-bold">{pack.coins.toLocaleString("th-TH")}</span>
                  {pack.bonus > 0 ? (
                    <span className={cn("text-xs font-semibold", pack.bestValue ? "text-white" : "text-[var(--brand-pink-on-light)]")}>
                      +{pack.bonus} เหรียญ
                    </span>
                  ) : null}
                  <span className="tabular mt-1 text-sm font-semibold">{pack.priceTHB.toLocaleString("th-TH")} บาท</span>
                  <span className={cn("text-[11px]", pack.bestValue ? "opacity-85" : "text-muted-foreground")}>
                    ประมาณ {perCoin} บาท/เหรียญ
                  </span>
                  {added ? (
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold" role="status">
                      <Check className="h-3.5 w-3.5" />
                      เติมแล้ว
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          ช่องทางจ่ายเงิน: TrueMoney Wallet · PromptPay QR · บัตรเครดิต/เดบิต · Rabbit LINE Pay
          <br />
          (เดโม — ยังไม่ได้เชื่อมต่อระบบชำระเงินจริง กดแพ็กเกจเพื่อทดลองเติมเหรียญ)
        </p>
      </section>
    </div>
  );
}
