import type { Metadata } from "next";
import { ArrowRight, BookOpenText, ChartNoAxesCombined, PenLine, WalletCards } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { AuthForm } from "@/components/interactive/auth-form";
import { PageShell } from "@/components/ui/section";
import { getCurrentUser } from "@/lib/auth/dal";
import { isActiveUser } from "@/lib/auth/permissions";
import { safeLoginCallback } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeLoginCallback(params.callbackUrl, "/");
  const currentUser = await getCurrentUser();
  if (currentUser && isActiveUser(currentUser)) redirect(callbackUrl);

  const writerFlow = callbackUrl === "/studio" || callbackUrl.startsWith("/studio/");
  const protectedGuestDestination = /^\/(?:studio|library|history|notifications|profile|settings|wallet)(?:\/|$)/u.test(callbackUrl);
  const guestHref = protectedGuestDestination ? "/" : callbackUrl;
  const journey = writerFlow
    ? [
        { icon: PenLine, title: "สร้างโปรไฟล์และผลงาน", detail: "ใช้บัญชีเดียวเป็นทั้งนักอ่านและนักเขียน" },
        { icon: BookOpenText, title: "เขียนและเผยแพร่", detail: "Draft, Schedule, Free, Paid และ Membership" },
        { icon: WalletCards, title: "สร้างรายได้อย่างตรวจสอบได้", detail: "ทุก Unlock เชื่อมถึง Revenue Ledger" },
        { icon: ChartNoAxesCombined, title: "เข้าใจแฟนของคุณ", detail: "ดูภาพรวมผู้ติดตาม สมาชิก และความสนใจ" },
      ]
    : [
        { icon: BookOpenText, title: "อ่านต่อได้ทุกอุปกรณ์", detail: "กลับมาตอนล่าสุดพร้อมตำแหน่งเดิม" },
        { icon: WalletCards, title: "Coins และตอนที่ปลดล็อก", detail: "สิทธิ์การอ่านผูกกับบัญชีอย่างถาวร" },
        { icon: ChartNoAxesCombined, title: "ติดตามเรื่องและนักเขียน", detail: "รับเฉพาะการแจ้งเตือนที่คุณเลือก" },
      ];

  return (
    <PageShell className="max-w-6xl py-4 sm:py-7 lg:py-10">
      <section className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="grid lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">
          <div className="order-2 flex flex-col justify-between bg-[#231f2a] p-5 text-white sm:p-8 lg:order-1 lg:p-10">
            <div>
              <div className="flex items-center gap-3">
                <BrandMark aria-hidden="true" className="h-11 w-20 shrink-0" />
                <BrandWordmark className="text-2xl text-white" />
              </div>
              <p className="mt-8 text-xs font-semibold uppercase text-white/60">
                {writerFlow ? "WRITER JOURNEY" : "YOUR NOVELNOW"}
              </p>
              <h1 className="mt-2 max-w-xl text-2xl font-semibold leading-9 sm:text-[32px] sm:leading-11">
                {writerFlow ? "จากไอเดียแรก สู่ผลงานที่สร้างรายได้" : "กลับมาอ่านต่อจากจุดเดิม"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                {writerFlow
                  ? "เข้าสู่ระบบครั้งเดียว แล้วทำงานต่อเนื่องตั้งแต่สร้างเรื่อง เขียนตอน เผยแพร่ ไปจนถึงดูรายได้และแฟนของคุณ"
                  : "พื้นที่ส่วนตัวสำหรับการอ่าน การติดตาม และสิทธิ์ที่คุณปลดล็อก โดยไม่เปิดเผยประวัติให้ผู้อื่น"}
              </p>

              <div className="mt-7 grid gap-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {journey.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex min-w-0 gap-3 border-t border-white/12 py-4 sm:pr-4">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-hover)]" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/60">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 border-t border-white/12 pt-5 text-xs text-white/60">
              <span>หลังเข้าสู่ระบบ</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              <span className="font-semibold text-white">
                {writerFlow ? "ไปยังสตูดิโอนักเขียน" : "กลับไปยังหน้าที่คุณเลือก"}
              </span>
            </div>
          </div>

          <div className="order-1 flex items-center justify-center bg-[var(--bg-elevated)] p-3 sm:p-8 lg:order-2 lg:p-10">
            <AuthForm
              callbackUrl={callbackUrl}
              error={params.error}
              intent={writerFlow ? "writer" : "reader"}
              guestHref={guestHref}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
