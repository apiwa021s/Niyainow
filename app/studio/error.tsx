"use client";

import { RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/section";

export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Studio page failed", error); }, [error]);
  return <ErrorState title="โหลดสตูดิโอไม่สำเร็จ" description="ข้อมูลของคุณยังอยู่ครบ ลองเชื่อมต่อใหม่อีกครั้ง" action={<Button type="button" onClick={reset}><RefreshCw className="h-4 w-4" aria-hidden />ลองอีกครั้ง</Button>} />;
}
