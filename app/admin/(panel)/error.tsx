"use client";

import { RotateCcw } from "lucide-react";
import { ErrorState } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

/** ผิดพลาดเฉพาะเนื้อหาในหน้า — เมนูซ้ายกับแถบบนยังอยู่ ทีมงานจึงไปหน้าอื่นต่อได้ทันที */
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="โหลดข้อมูลหน้านี้ไม่สำเร็จ"
      description="ลองโหลดใหม่อีกครั้ง ถ้ายังไม่หายให้แจ้งทีมเทคนิคพร้อมบอกว่าอยู่หน้าไหนตอนเกิดปัญหา"
      action={
        <Button onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          ลองใหม่
        </Button>
      }
    />
  );
}
