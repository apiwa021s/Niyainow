"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { useReaderStore } from "@/stores/use-reader-store";

const schema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่ออย่างน้อย 2 ตัวอักษร"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
});

type FormData = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" | "forgot" }) {
  const router = useRouter();
  const login = useReaderStore((state) => state.login);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "นักอ่าน NiyaiNow", email: "reader@niyainow.test", password: "reader123" }
  });

  function onSubmit(data: Partial<FormData>) {
    if (mode !== "forgot") login(data.name || "นักอ่าน NiyaiNow");
    router.push(mode === "forgot" ? "/login" : "/profile");
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>{mode === "login" ? "เข้าสู่ระบบ" : mode === "register" ? "สมัครสมาชิก" : "ลืมรหัสผ่าน"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          {mode === "register" ? (
            <label className="grid gap-2">
              <Label>ชื่อที่แสดง</Label>
              <Input {...register("name")} />
              {errors.name ? <span className="text-xs text-destructive">{errors.name.message}</span> : null}
            </label>
          ) : null}
          <label className="grid gap-2">
            <Label>อีเมล</Label>
            <Input {...register("email")} />
            {errors.email ? <span className="text-xs text-destructive">{errors.email.message}</span> : null}
          </label>
          {mode !== "forgot" ? (
            <label className="grid gap-2">
              <Label>รหัสผ่าน</Label>
              <Input type="password" {...register("password")} />
              {errors.password ? <span className="text-xs text-destructive">{errors.password.message}</span> : null}
            </label>
          ) : null}
          <Button disabled={isSubmitting}>{mode === "forgot" ? "ส่งลิงก์รีเซ็ต" : mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">เข้าสู่ระบบ</Link>
          <Link href="/register" className="hover:text-foreground">สมัครสมาชิก</Link>
          <Link href="/forgot-password" className="hover:text-foreground">ลืมรหัสผ่าน</Link>
        </div>
      </CardContent>
    </Card>
  );
}
