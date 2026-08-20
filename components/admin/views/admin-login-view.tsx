import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { TurnstileGate } from "@/components/interactive/turnstile-widget";
import { signInWithGoogle } from "@/lib/auth/actions";

export function AdminLoginView({ callbackUrl = "/admin", error }: { callbackUrl?: string; error?: string }) {
  return (
    <main id="main" className="grid min-h-screen place-items-center bg-[#151517] px-4 py-10">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-[var(--sh-3)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)]/12 px-2 py-1 text-xs font-bold text-[var(--brand-light-on-light)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            ระบบหลังบ้าน
          </p>
          <h1 className="mt-1 text-xl font-bold">เข้าสู่ระบบสำหรับทีมงาน</h1>
          <p className="text-sm text-muted-foreground">
            เฉพาะบัญชี Google ที่ได้รับสิทธิ์ ADMIN หรือ EDITOR และยังเปิดใช้งานอยู่เท่านั้น
          </p>
        </div>

        {error ? (
          <p role="alert" className="mb-4 rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive">
            บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน หรือถูกระงับการใช้งาน
          </p>
        ) : null}

        <form className="grid gap-4" action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <TurnstileGate label="เข้าสู่ระบบทีมงานด้วย Google" />
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Google OAuth เท่านั้น</span>
          <Link href="/" className="font-semibold text-[var(--brand-light-on-light)] hover:underline">
            กลับไปหน้าเว็บไซต์
          </Link>
        </div>

        <p className="mt-5 rounded-[10px] bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          สิทธิ์การเข้าถึงถูกตรวจสอบจากฐานข้อมูลบนเซิร์ฟเวอร์ทุกครั้งก่อนเปิดหน้าหลังบ้าน การซ่อนเมนูในหน้าเว็บไม่ถือเป็นการอนุญาต
        </p>
      </div>
    </main>
  );
}
