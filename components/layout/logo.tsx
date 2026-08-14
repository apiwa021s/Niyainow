import Link from "next/link";
import Image from "next/image";

import { BrandWordmark } from "@/components/brand/brand-mark";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 tracking-normal" aria-label="NiyaiNow หน้าแรก">
      <span className="flex h-11 w-14 shrink-0 items-center justify-center">
        <Image
          src="/Images/Logo/logo.png"
          alt=""
          width={56}
          height={46}
          priority
          className="h-11 w-auto object-contain drop-shadow-[0_10px_24px_rgba(109,40,255,0.28)]"
        />
      </span>
      <span className="hidden flex-col gap-1 sm:flex">
        <BrandWordmark />
        <span className="text-[11px] font-semibold text-muted-foreground">นิยายใหม่ • อัปเดตไว • อ่านได้ทันที</span>
      </span>
    </Link>
  );
}
