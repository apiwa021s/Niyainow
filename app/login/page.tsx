import type { Metadata } from "next";

import { AuthForm } from "@/components/interactive/auth-form";
import { PageHeader, PageShell } from "@/components/ui/section";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl, "/");

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        eyebrow="ACCOUNT / OPTIONAL"
        title="เข้าสู่ระบบเมื่อต้องการเก็บความคืบหน้า"
        description="ทุกคนอ่านนิยายสาธารณะได้ทันที บัญชีมีไว้สำหรับฟีเจอร์ส่วนบุคคลและการซิงก์ระหว่างอุปกรณ์"
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] lg:items-start">
        <div className="border-l-2 border-[var(--brand-emphasis)] pl-5">
          <p className="font-serif text-xl font-semibold">กลับไปยังเรื่องที่อ่านค้างไว้ได้ง่ายขึ้น</p>
          <ul className="mt-4 grid gap-3 text-sm leading-7 text-muted-foreground">
            <li>บันทึกเรื่องโปรดไว้ในชั้นหนังสือ</li>
            <li>ซิงก์ตอนล่าสุดที่อ่านและประวัติการอ่าน</li>
            <li>ตั้งค่าประสบการณ์อ่านในพื้นที่ของคุณ</li>
          </ul>
        </div>
        <AuthForm callbackUrl={callbackUrl} error={params.error} />
      </div>
    </PageShell>
  );
}
