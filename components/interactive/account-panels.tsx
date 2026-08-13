"use client";

import Link from "next/link";
import { Bell, BookMarked, Clock, LogOut, Save, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/form-controls";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { useReaderStore } from "@/stores/use-reader-store";

export function ProfilePanel() {
  const { isLoggedIn, name, history, follows, bookmarks, logout } = useReaderStore();
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader><CardTitle>โปรไฟล์</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-primary text-xl font-semibold text-white"><UserRound className="h-8 w-8" /></div>
            <div>
              <p className="font-semibold">{isLoggedIn ? name : "ผู้เยี่ยมชม"}</p>
              <p className="text-sm text-muted-foreground">{isLoggedIn ? "บัญชี mock พร้อมใช้งาน" : "เข้าสู่ระบบเพื่อซิงก์คลัง mock"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/library"><Button><BookMarked className="h-4 w-4" />เปิดคลัง</Button></Link>
            <Link href="/history"><Button variant="secondary"><Clock className="h-4 w-4" />ประวัติ</Button></Link>
            {isLoggedIn ? <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4" />ออกจากระบบ</Button> : <Link href="/login"><Button variant="outline">เข้าสู่ระบบ</Button></Link>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>สรุปการอ่าน</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>กำลังอ่าน: {history.length} เรื่อง</p>
          <p>ติดตาม: {follows.length} เรื่อง</p>
          <p>บุ๊กมาร์ก: {bookmarks.length} เรื่อง</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPanel() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>บัญชี</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-2"><Label>ชื่อที่แสดง</Label><Input defaultValue="นักอ่าน NiyaiNow" /></label>
          <label className="grid gap-2"><Label>อีเมล</Label><Input defaultValue="reader@niyainow.test" /></label>
          <Button><Save className="h-4 w-4" />บันทึก</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>การแสดงผล</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>ธีมเว็บไซต์</Label>
            <ThemeSwitcher />
          </div>
          <label className="grid gap-2"><Label>ภาษาแจ้งเตือน</Label><Select defaultValue="th"><option value="th">ไทย</option><option value="en">English</option></Select></label>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsPanel() {
  const follows = useReaderStore((state) => state.follows);
  return (
    <div className="grid gap-3">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="p-4">
          <div className="flex gap-3">
            <Bell className="mt-1 h-5 w-5 text-[var(--brand-accent)]" />
            <div>
              <p className="font-medium">{follows.length ? "เรื่องที่ติดตามมีตอนใหม่" : "ยินดีต้อนรับสู่ NiyaiNow"}</p>
              <p className="text-sm text-muted-foreground">{follows.length ? "มีตอนใหม่พร้อมอ่านในคลังของคุณ" : "ติดตามนิยายเพื่อรับแจ้งเตือนตอนใหม่"}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
