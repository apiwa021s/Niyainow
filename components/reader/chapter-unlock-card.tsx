"use client";

import { Check, LockKeyhole, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { unlockChapterAction, type UnlockChapterActionState } from "@/app/actions/chapter-unlock";
import { Button } from "@/components/ui/button";

const initialState: UnlockChapterActionState = { status: "idle" };

function UnlockSubmitButton({ price }: { price: number }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      <LockKeyhole className="h-4 w-4" aria-hidden />
      ใช้ {price.toLocaleString("th-TH")} เหรียญปลดล็อก
    </Button>
  );
}

export function ChapterUnlockCard({
  novelSlug,
  novelTitle,
  chapterNumber,
  price,
  balance,
  isAuthenticated,
}: {
  novelSlug: string;
  novelTitle: string;
  chapterNumber: number;
  price: number;
  balance: number;
  isAuthenticated: boolean;
}) {
  const [state, formAction] = useActionState(unlockChapterAction, initialState);
  const currentPrice = state.currentPrice ?? price;
  const currentBalance = state.balance ?? balance;
  const hasEnough = currentBalance >= currentPrice;
  const callbackUrl = `/novel/${novelSlug}/chapter/${chapterNumber}`;
  const loginHref = `/login?${new URLSearchParams({ callbackUrl }).toString()}`;

  return (
    <section aria-labelledby="chapter-unlock-heading" className="mt-10 bg-current/6 px-5 py-7 text-center sm:px-8">
      <div className="mx-auto max-w-xl">
        <Image
          src="/Images/Coins/nn-gold-coin.png"
          alt=""
          width={64}
          height={64}
          className="mx-auto h-16 w-16 object-contain"
        />
        <h2 id="chapter-unlock-heading" className="mt-3 text-xl font-semibold">ปลดล็อกตอนนี้เพื่ออ่านต่อ</h2>
        <p className="mt-2 text-sm leading-6 opacity-70">
          ตอน {chapterNumber.toLocaleString("th-TH")} จาก {novelTitle} · ปลดล็อกครั้งเดียว อ่านซ้ำได้ถาวร
        </p>

        <div className="mx-auto mt-5 flex max-w-sm items-center justify-between gap-4 bg-current/5 px-4 py-3 text-sm">
          <span className="opacity-70">ราคาตอน</span>
          <span className="inline-flex items-center gap-2 font-semibold tabular-nums">
            <Image src="/Images/Coins/nn-gold-coin.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
            {currentPrice.toLocaleString("th-TH")} เหรียญ
          </span>
        </div>

        {isAuthenticated ? (
          <>
            <p className="mt-3 inline-flex items-center gap-2 text-sm opacity-75">
              <WalletCards className="h-4 w-4" aria-hidden />
              คงเหลือ {currentBalance.toLocaleString("th-TH")} เหรียญ
            </p>
            <form action={formAction} className="mt-5 flex flex-col items-center gap-3">
              <input type="hidden" name="novelSlug" value={novelSlug} />
              <input type="hidden" name="chapterNumber" value={chapterNumber} />
              <input type="hidden" name="expectedPrice" value={currentPrice} />
              {hasEnough ? (
                <UnlockSubmitButton price={currentPrice} />
              ) : (
                <Link href="/wallet/top-up" className="inline-flex min-h-11 items-center justify-center bg-[var(--reader-action)] px-5 text-sm font-semibold text-white">
                  เติมเหรียญเพื่ออ่านต่อ
                </Link>
              )}
              <p className="flex items-center gap-1.5 text-xs opacity-60">
                <Check className="h-3.5 w-3.5" aria-hidden />
                ระบบจะตัดเหรียญเมื่อปลดล็อกสำเร็จเท่านั้น
              </p>
            </form>
          </>
        ) : (
          <div className="mt-5">
            <Link href={loginHref} className="inline-flex min-h-11 items-center justify-center bg-[var(--reader-action)] px-5 text-sm font-semibold text-white">
              เข้าสู่ระบบเพื่อปลดล็อก
            </Link>
            <p className="mt-3 text-xs opacity-60">ระบบจะพากลับมาที่ตอนนี้หลังเข้าสู่ระบบ</p>
          </div>
        )}

        {state.message ? (
          <p
            role={state.status === "error" || state.status === "account-disabled" ? "alert" : "status"}
            aria-live="polite"
            className="mt-4 text-sm font-medium text-[var(--reader-accent)]"
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
