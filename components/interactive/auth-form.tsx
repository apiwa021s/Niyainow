"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import { signInWithGoogle } from "@/lib/auth/actions";
import { Button, type ButtonSize } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z" />
      <path d="M12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.54c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.62A10 10 0 0 0 12 22Z" opacity=".85" />
      <path d="M6.39 13.85A6.02 6.02 0 0 1 6.07 12c0-.64.11-1.27.32-1.85V7.53H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.47l3.35-2.62Z" opacity=".7" />
      <path d="M12 6.01c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.53l3.35 2.62C7.18 7.78 9.39 6.01 12 6.01Z" opacity=".55" />
    </svg>
  );
}

export function GoogleSignInButton({
  label = "ดำเนินการต่อด้วย Google",
  size = "lg",
  className,
}: {
  label?: string;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size={size} className={className} loading={pending}>
      <GoogleMark />
      {label}
    </Button>
  );
}

export function AuthForm({ callbackUrl = "/", error }: { callbackUrl?: string; error?: string }) {
  return (
    <Card className="max-w-lg shadow-[var(--sh-1)]">
      <CardHeader>
        <p className="editorial-kicker">READER ACCOUNT</p>
        <CardTitle className="font-serif text-2xl">ซิงก์พื้นที่อ่านของคุณ</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          ใช้บัญชี Google เพื่อเก็บชั้นหนังสือ ประวัติ และความคืบหน้าไว้ข้ามอุปกรณ์ การอ่านเนื้อหาสาธารณะไม่จำเป็นต้องเข้าสู่ระบบ
        </p>

        {error ? (
          <p role="alert" className="mb-4 rounded-[6px] border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
            ไม่สามารถเข้าสู่ระบบได้ โปรดลองอีกครั้งหรือตรวจสอบสิทธิ์ของบัญชี Google
          </p>
        ) : null}

        <form className="grid gap-4" action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <GoogleSignInButton />
        </form>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          เมื่อดำเนินการต่อ แสดงว่าคุณยอมรับ{" "}
          <Link href="/terms" className="font-medium text-foreground hover:underline">
            ข้อกำหนดการใช้งาน
          </Link>{" "}
          และ
          <Link href="/privacy" className="font-medium text-foreground hover:underline">
            นโยบายความเป็นส่วนตัว
          </Link>
          ของ NiyaiThai
        </p>

        <Link href={callbackUrl} className="mt-4 flex min-h-11 items-center justify-center rounded-[6px] text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
          อ่านต่อโดยไม่เข้าสู่ระบบ
        </Link>
      </CardContent>
    </Card>
  );
}
