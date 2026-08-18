import { ArrowLeft, Check, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const coinPackages = [
  { coins: 50, bonus: 0, price: 59, badge: null },
  { coins: 100, bonus: 10, price: 109, badge: null },
  { coins: 300, bonus: 45, price: 299, badge: "ยอดนิยม" },
  { coins: 500, bonus: 100, price: 479, badge: "คุ้มสุด" },
] as const;

export function CoinTopUpView() {
  return (
    <div className="space-y-7 pb-4">
      <Link
        href="/wallet"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-(--text-secondary) hover:text-(--text-primary)"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        กลับไปกระเป๋าเหรียญ
      </Link>

      <section className="relative isolate overflow-hidden rounded-(--r-lg) bg-[linear-gradient(120deg,#6b4308_0%,#b9780d_52%,#f1bd43_100%)] px-5 py-6 text-white sm:px-8 sm:py-8 lg:min-h-64">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_32%,rgba(255,244,190,0.5),transparent_28%)]" />
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-xs font-semibold">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              เตรียมเปิดให้บริการ
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">เติมเหรียญ NovelNow</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
              ใช้เหรียญ NN เพื่อปลดล็อกตอนที่ต้องการอ่าน แพ็กเกจด้านล่างเป็นรายการเตรียมเปิดและยังไม่มีการเรียกเก็บเงินจริงในขณะนี้
            </p>
          </div>
          <div className="relative mx-auto aspect-square w-44 sm:w-52 lg:w-60">
            <Image
              src="/Images/Coins/nn-gold-coin.png"
              alt="เหรียญทอง NovelNow พร้อมตรา N"
              fill
              sizes="(min-width: 1024px) 240px, (min-width: 640px) 208px, 176px"
              className="object-contain"
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="coin-packages-heading">
        <div className="mb-4">
          <p className="editorial-kicker">COIN PACKAGES</p>
          <h2 id="coin-packages-heading" className="mt-1 text-h1 font-semibold">เลือกแพ็กเกจเหรียญ</h2>
          <p className="mt-2 text-sm text-(--text-secondary)">เหรียญโบนัสจะรวมเข้ากับยอดที่ได้รับเมื่อระบบชำระเงินเปิดใช้งาน</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {coinPackages.map((pack) => {
            const total = pack.coins + pack.bonus;
            const highlighted = pack.badge === "ยอดนิยม";

            return (
              <li key={pack.coins}>
                <article
                  className={cn(
                    "relative flex h-full flex-col rounded-(--r-lg) bg-surface p-4 shadow-[var(--sh-1)]",
                    highlighted && "ring-2 ring-amber-400/80",
                  )}
                >
                  {pack.badge ? (
                    <span className="absolute right-3 top-3 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {pack.badge}
                    </span>
                  ) : null}

                  <div className="relative h-14 w-14">
                    <Image src="/Images/Coins/nn-gold-coin.png" alt="" fill sizes="56px" className="object-contain" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums">{total.toLocaleString("th-TH")} เหรียญ</p>
                  {pack.bonus > 0 ? (
                    <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                      {pack.coins.toLocaleString("th-TH")} + โบนัส {pack.bonus.toLocaleString("th-TH")}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-(--text-secondary)">รับเหรียญเต็มจำนวน</p>
                  )}
                  <p className="mt-5 text-xl font-semibold tabular-nums">฿{pack.price.toLocaleString("th-TH")}</p>
                  <Button type="button" disabled className="mt-4 w-full" aria-describedby="payment-status-note">
                    <LockKeyhole className="h-4 w-4" aria-hidden />
                    ยังไม่เปิดชำระเงิน
                  </Button>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="grid gap-5 rounded-(--r-lg) bg-surface/70 p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <h2 className="text-h2 font-semibold">ชำระเงินอย่างปลอดภัยเมื่อระบบพร้อม</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-(--text-secondary) sm:grid-cols-2">
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />เพิ่มเหรียญหลังผู้ให้บริการยืนยันการชำระเงิน</li>
            <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />แสดงประวัติรายการและเลขอ้างอิงทุกครั้ง</li>
          </ul>
          <p id="payment-status-note" className="mt-4 text-xs leading-5 text-(--text-tertiary)">
            หน้านี้ยังไม่ส่งข้อมูลไปยังผู้ให้บริการชำระเงินและไม่ตัดยอดจากบัญชีของคุณ ดูรายละเอียดเพิ่มเติมใน{" "}
            <Link href="/terms" className="font-semibold text-(--text-secondary) underline-offset-4 hover:underline">ข้อกำหนดการใช้งาน</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
