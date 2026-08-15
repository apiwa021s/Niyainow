import Link from "next/link";
import { BellOff, BookMarked, Clock, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/form-controls";
import { signOutUser } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/dal";

export type ProfileSummary = {
  libraryCount: number;
  readingCount: number;
  completedCount: number;
  followingCount: number;
  historyCount: number;
};

export function ProfilePanel({ user, summary }: { user: CurrentUser; summary: ProfileSummary }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader><CardTitle>โปรไฟล์</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-primary text-xl font-semibold text-white">
              <UserRound className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold">{user.name || "นักอ่าน NiyaiThai"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> เข้าสู่ระบบด้วย Google
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/library"><Button><BookMarked className="h-4 w-4" />เปิดคลัง</Button></Link>
            <Link href="/history"><Button variant="secondary"><Clock className="h-4 w-4" />ประวัติ</Button></Link>
            <form action={signOutUser}>
              <input type="hidden" name="callbackUrl" value="/" />
              <Button type="submit" variant="outline"><LogOut className="h-4 w-4" />ออกจากระบบ</Button>
            </form>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>สรุปการอ่าน</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>กำลังอ่าน: {summary.readingCount.toLocaleString("th-TH")} เรื่อง</p>
          <p>อ่านจบ: {summary.completedCount.toLocaleString("th-TH")} เรื่อง</p>
          <p>ติดตาม: {summary.followingCount.toLocaleString("th-TH")} เรื่อง</p>
          <p>ประวัติ: {summary.historyCount.toLocaleString("th-TH")} เรื่อง</p>
        </CardContent>
      </Card>
    </div>
  );
}
export function SettingsPanel({ user }: { user: CurrentUser }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>บัญชี</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-2">
            <Label>ชื่อที่แสดง</Label>
            <Input value={user.name || "นักอ่าน NiyaiThai"} readOnly disabled />
          </label>
          <label className="grid gap-2">
            <Label>อีเมล</Label>
            <Input value={user.email || ""} readOnly disabled />
          </label>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ข้อมูลบัญชีมาจาก Google หากต้องการเปลี่ยนชื่อหรืออีเมล โปรดแก้ไขในบัญชี Google ของคุณ
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>การแสดงผล</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>ธีมเว็บไซต์</Label>
            <ThemeSwitcher />
          </div>
          <p className="text-sm text-muted-foreground">การตั้งค่าธีมและหน้าตาเครื่องอ่านจะบันทึกไว้ในอุปกรณ์นี้</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsPanel({ followingCount }: { followingCount: number }) {
  return (
    <Card className="p-6">
      <div className="flex gap-4">
        <BellOff className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-semibold">ยังไม่เปิดใช้งานการแจ้งเตือน</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            ระบบบันทึกนิยายที่คุณติดตามไว้แล้ว {followingCount.toLocaleString("th-TH")} เรื่อง แต่ยังไม่ส่งอีเมลหรือการแจ้งเตือนบนอุปกรณ์ในขณะนี้
          </p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-[var(--brand-light-on-light)]">
            ไปดูอัปเดตบนหน้าแรก 
          </Link>
        </div>
      </div>
    </Card>
  );
}
