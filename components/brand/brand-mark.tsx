import type { ComponentType, HTMLAttributes, SVGProps } from "react";
import { BookOpen, Heart, MessageCircle, Sparkles, Zap } from "lucide-react";
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
        "relative inline-grid aspect-square place-items-center overflow-hidden rounded-[7px] border border-[color-mix(in_srgb,var(--brand-primary)_55%,var(--border))]",
        framed ? "bg-[#111]" : "bg-[var(--brand-primary)]",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="absolute -right-[16%] -top-[16%] h-[72%] w-[72%] rounded-full bg-[#e02028]" />
      <BookOpen aria-hidden className="relative h-[54%] w-[54%] text-white" strokeWidth={1.7} />
      <span aria-hidden className="absolute bottom-[15%] left-[18%] h-px w-[64%] bg-white/80" />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-baseline text-xl font-semibold leading-none tracking-[-0.025em]", className)}>
      <span>Niyai</span>
      <span className="text-[var(--brand-primary)]">Thai</span>
      <span aria-hidden className="ml-1.5 font-serif text-[9px] font-normal tracking-normal text-muted-foreground">物語</span>
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
