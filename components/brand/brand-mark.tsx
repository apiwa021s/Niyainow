import type { ComponentType, SVGProps } from "react";
import { useId } from "react";
import { BookOpen, Heart, MessageCircle, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkProps = SVGProps<SVGSVGElement> & {
  framed?: boolean;
};

export function BrandMark({ className, framed = false, ...props }: BrandMarkProps) {
  const id = useId().replace(/:/g, "");
  const coverId = `niyai-mark-cover-${id}`;
  const pageId = `niyai-mark-page-${id}`;
  const flashId = `niyai-mark-flash-${id}`;

  return (
    <svg viewBox="0 0 96 96" role="img" aria-label="NiyaiNow" className={className} {...props}>
      <defs>
        <linearGradient id={coverId} x1="18" x2="80" y1="72" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2B1257" />
          <stop offset="0.5" stopColor="#6D28FF" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        <linearGradient id={pageId} x1="22" x2="67" y1="14" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7F7FB" />
          <stop offset="0.52" stopColor="#DCCBFF" />
          <stop offset="1" stopColor="#FF6EC7" />
        </linearGradient>
        <linearGradient id={flashId} x1="33" x2="62" y1="34" y2="76" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFD5F0" />
        </linearGradient>
      </defs>
      {framed ? <rect width="96" height="96" rx="26" fill="#130537" /> : null}
      {framed ? <rect x="1" y="1" width="94" height="94" rx="25" fill={`url(#${coverId})`} opacity="0.18" /> : null}
      <path d="M17 32c0-7 5-12 12-12h16c8 0 15 6 15 14v36c-6-7-13-10-22-10h-8c-7 0-13-6-13-13V32Z" fill={`url(#${coverId})`} />
      <path d="M79 32c0-7-5-12-12-12H51c-8 0-15 6-15 14v36c6-7 13-10 22-10h8c7 0 13-6 13-13V32Z" fill={`url(#${coverId})`} />
      <path d="M36 68c-1 8-5 14-12 18V59c5 0 9 3 12 9Z" fill="#4C1D95" />
      <path d="M23 20c13 2 22 7 27 18v9c-7-9-16-15-27-17V20Z" fill="#F7F7FB" opacity="0.95" />
      <path d="M27 15c12 2 20 7 24 18v6c-7-8-15-13-24-16v-8Z" fill="#C9B5FF" />
      <path d="M73 20c-13 2-22 7-27 18v9c7-9 16-15 27-17V20Z" fill={`url(#${pageId})`} />
      <path d="M69 15c-12 2-20 7-24 18v6c7-8 15-13 24-16v-8Z" fill="#FF6EC7" />
      <path d="M50 35 31 59h15l-5 23 24-32H50l7-15h-7Z" fill={`url(#${flashId})`} />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-baseline text-xl font-extrabold leading-none tracking-normal", className)}>
      <span>Niyai</span>
      <span className="bg-gradient-to-r from-[#6D28FF] via-[#A855F7] to-[#FF6EC7] bg-clip-text text-transparent">Now</span>
      <span className="absolute -top-1 left-[4.7rem] h-2 w-2 rotate-45 rounded-[2px] bg-[var(--brand-accent)] shadow-[0_0_18px_rgba(255,110,199,0.55)]" />
    </span>
  );
}

const glyphs: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  book: BookOpen,
  fast: Zap,
  heart: Heart,
  read: MessageCircle,
  sparkle: Sparkles
};

export function BrandGlyph({
  type = "sparkle",
  className,
  iconClassName
}: {
  type?: keyof typeof glyphs;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = glyphs[type] ?? Sparkles;

  return (
    <span className={cn("inline-grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/12 bg-primary/12 text-[var(--brand-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]", className)}>
      <Icon className={cn("h-4 w-4", iconClassName)} />
    </span>
  );
}

export function BrandSectionSignal({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-hidden="true">
      <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/12 text-[var(--brand-accent)] ring-1 ring-border">
        <BrandMark className="h-5 w-5" />
      </span>
      <span className="h-px w-9 bg-gradient-to-r from-[var(--brand-accent)] to-transparent" />
    </span>
  );
}
