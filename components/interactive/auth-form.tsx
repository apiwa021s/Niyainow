"use client";

import { CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { signInWithGoogle } from "@/lib/auth/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TurnstileGate } from "@/components/interactive/turnstile-widget";

const errorMessages: Record<string, string> = {
  captcha: "การตรวจสอบความปลอดภัยหมดอายุหรือไม่สำเร็จ กรุณาตรวจสอบใหม่แล้วลองอีกครั้ง",
  rate_limited: "มีการพยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
  AccountDisabled: "บัญชีนี้ถูกระงับหรือปิดใช้งาน กรุณาติดต่อทีม NovelNow",
  AccessDenied: "บัญชี Google นี้ไม่ผ่านเงื่อนไขการเข้าสู่ระบบ กรุณาเลือกบัญชีอื่น",
  OAuthAccountNotLinked: "อีเมลนี้เชื่อมกับบัญชีอื่นอยู่แล้ว กรุณาใช้บัญชี Google เดิม",
  Configuration: "ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
};

export function AuthForm({
  callbackUrl = "/",
  error,
  intent = "reader",
  guestHref = "/",
}: {
  callbackUrl?: string;
  error?: string;
  intent?: "reader" | "writer";
  guestHref?: string;
}) {
  const writer = intent === "writer";
  const errorMessage = error
    ? errorMessages[error] ?? "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้งหรือลองใช้บัญชี Google อื่น"
    : null;

  return (
    <Card className="w-full max-w-lg overflow-hidden rounded-[8px] border-[color-mix(in_srgb,var(--brand-primary)_20%,var(--border))] shadow-[var(--sh-2)]">
      <div aria-hidden className="h-1 bg-[var(--brand-primary)]" />
      <CardHeader className="gap-2 p-5 pb-4 sm:p-6 sm:pb-4">
        <p className="editorial-kicker">{writer ? "WRITER ACCESS" : "NOVELNOW ACCOUNT"}</p>
        <CardTitle className="text-xl sm:text-2xl">
          {writer ? "เข้าสู่สตูดิโอนักเขียน" : "เข้าสู่พื้นที่ของคุณ"}
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          {writer
            ? "ใช้บัญชี Google เดียวกับพื้นที่อ่าน จากนั้นสร้างโปรไฟล์นักเขียนและเริ่มผลงานแรกได้ทันที"
            : "ซิงก์ชั้นหนังสือ ความคืบหน้า Coins และการติดตามไว้ข้ามอุปกรณ์"}
        </p>
      </CardHeader>
      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {errorMessage ? (
          <div
            id="login-error"
            role="alert"
            className="mb-4 flex gap-2.5 rounded-[6px] border border-destructive/30 bg-destructive/6 p-3 text-sm leading-6 text-destructive"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form className="grid gap-4" action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <TurnstileGate
            className="w-full"
            label={writer ? "เข้าสู่สตูดิโอด้วย Google" : "เข้าสู่ระบบด้วย Google"}
          />
        </form>

        <div id="auth-provider-note" className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />
          <p>Google OAuth เท่านั้น NovelNow ไม่เห็นหรือจัดเก็บรหัสผ่าน Google ของคุณ</p>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          เมื่อดำเนินการต่อ แสดงว่าคุณยอมรับ{" "}
          <Link href="/terms" className="font-medium text-foreground hover:underline">
            ข้อกำหนดการใช้งาน
          </Link>{" "}
          และ
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            นโยบายความเป็นส่วนตัว
          </Link>
          ของ NovelNow
        </p>

        <div className="mt-5 border-t border-border pt-3">
          <Link
            href={guestHref}
            className="flex min-h-11 items-center justify-center gap-2 rounded-[6px] text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden />
            {writer ? "กลับไปหน้าอ่านนิยาย" : "ใช้งานต่อโดยไม่เข้าสู่ระบบ"}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
