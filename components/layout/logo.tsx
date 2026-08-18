import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string } = {}) {
  return (
    <Link href="/" className={cn("flex h-11 items-center gap-2 tracking-normal", className)} aria-label="NovelNow หน้าแรก">
      <BrandMark className="h-7 w-auto shrink-0" />
      <span className="hidden sm:inline-flex"><BrandWordmark /></span>
    </Link>
  );
}
