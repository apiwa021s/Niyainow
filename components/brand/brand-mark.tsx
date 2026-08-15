import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BrandMarkProps = HTMLAttributes<HTMLSpanElement> & {
  framed?: boolean;
};

export function BrandMark({ className, framed = false, ...props }: BrandMarkProps) {
  return (
    <span
      role="img"
      aria-label="NiyaiThai"
      className={cn(
        "relative inline-grid aspect-square place-items-center overflow-hidden rounded-[6px] border border-[color-mix(in_srgb,var(--brand-primary)_55%,var(--border))]",
        framed ? "bg-[#151517]" : "bg-[var(--brand-primary)]",
        className,
      )}
      {...props}
    >
      <svg aria-hidden viewBox="0 0 32 32" className="h-[72%] w-[72%] text-white" fill="none">
        <path d="M5.5 7.5c4.4 0 7.7 1.2 10.5 3.6v14.1c-2.8-2.2-6.1-3.3-10.5-3.3V7.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M26.5 7.5c-4.4 0-7.7 1.2-10.5 3.6v14.1c2.8-2.2 6.1-3.3 10.5-3.3V7.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M16 7v18.2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
      <span aria-hidden className="absolute inset-y-[14%] left-[12%] w-px bg-white/70" />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-baseline text-xl font-semibold leading-none tracking-[-0.025em]", className)}>
      <span>Niyai</span>
      <span className="text-[var(--brand-emphasis)]">Thai</span>
    </span>
  );
}
