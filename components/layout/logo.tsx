import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 tracking-normal" aria-label="NiyaiNow หน้าแรก">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#130537] shadow-[0_10px_30px_rgba(109,40,255,0.28)] ring-1 ring-white/15">
        <BrandMark className="h-8 w-8" />
      </span>
      <span className="hidden flex-col gap-1 sm:flex">
        <BrandWordmark />
        <span className="text-[11px] font-semibold text-muted-foreground">นิยายใหม่ • อัปเดตไว • อ่านได้ทันที</span>
      </span>
    </Link>
  );
}
