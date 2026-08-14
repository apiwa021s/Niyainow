"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";

const schema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
  otp: z.string().optional()
});

type FormData = z.infer<typeof schema>;

export function AdminLoginView() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "nattha@niyainow.test", password: "admin1234", otp: "" }
  });

  return (
    <main id="main" className="grid min-h-screen place-items-center bg-[image:var(--grad-hero)] px-4 py-10">
      <div className="w-full max-w-md rounded-[24px] border border-border bg-card p-6 shadow-[var(--sh-3)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo />
          <p className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--brand-primary)]/12 px-2 py-1 text-xs font-bold text-[var(--brand-light-on-light)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            ระบบหลังบ้าน
          </p>
          <h1 className="mt-1 text-xl font-bold">เข้าสู่ระบบสำหรับทีมงาน</h1>
          <p className="text-sm text-muted-foreground">เฉพาะบัญชีที่ได้รับสิทธิ์เท่านั้น ทุกการเข้าใช้งานถูกบันทึกไว้</p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit(() => router.push("/admin"))}>
          <Field label="อีเมลทีมงาน" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} invalid={Boolean(errors.email)} />
          </Field>

          <Field label="รหัสผ่าน" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} invalid={Boolean(errors.password)} />
          </Field>

          <Field label="รหัส 6 หลักจากแอป (ถ้าเปิดใช้)" hint="บัญชีระดับผู้ดูแลระบบขึ้นไปต้องยืนยันสองชั้นเสมอ">
            <Input inputMode="numeric" maxLength={6} placeholder="000000" className="tabular" {...register("otp")} />
          </Field>

          <Button type="submit" size="lg" loading={isSubmitting}>
            <LogIn className="h-4 w-4" />
            เข้าสู่ระบบ
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
            ลืมรหัสผ่าน
          </Link>
          <Link href="/" className="font-semibold text-[var(--brand-light-on-light)] hover:underline">
            กลับไปหน้าเว็บ
          </Link>
        </div>

        <p className="mt-5 rounded-[10px] bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
          ระบบสาธิต — กรอกอะไรก็เข้าได้ ยังไม่มีการตรวจสอบสิทธิ์จริง อย่าใช้กับข้อมูลจริงของผู้ใช้
        </p>
      </div>
    </main>
  );
}
