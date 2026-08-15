import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";

export function Logo() {
  return (
    <Link href="/" className="flex h-11 items-center gap-2.5 tracking-normal" aria-label="NiyaiThai หน้าแรก">
      <BrandMark className="h-8 w-8 shrink-0" />
      <span className="hidden sm:inline-flex"><BrandWordmark /></span>
    </Link>
  );
}
