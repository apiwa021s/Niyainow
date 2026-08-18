import Image from "next/image";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  framed?: boolean;
};

export function BrandMark({ className, framed = false, ...props }: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label="NovelNow"
      className={cn(
        "relative inline-flex aspect-[602/335] items-center justify-center overflow-visible",
        framed ? "rounded-[6px] bg-[#151517] p-1" : "bg-transparent",
        className,
      )}
      {...props}
    >
      <Image
        src="/Images/Logo/logo.png"
        alt=""
        fill
        sizes="64px"
        className="object-contain dark:hidden"
      />
      <Image
        src="/Images/Logo/logo-dark.png"
        alt=""
        fill
        sizes="64px"
        className="hidden object-contain dark:block"
      />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-baseline text-xl font-semibold leading-none tracking-[-0.025em]", className)}>
      <span>Novel</span>
      <span className="text-[var(--brand-emphasis)]">Now</span>
    </span>
  );
}
