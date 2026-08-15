import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Button (ส่วนที่ 7)
 * variant: primary(gradient) · secondary(solid ม่วง) · ghost · text · danger
 * size:    sm 32 / md 40 / lg 48px
 * ทุก variant ใช้ semantic token — ห้าม hardcode white/ ไม่งั้นธีมสว่างพัง
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "text" | "danger" | "outline" | "default";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)] hover:bg-[var(--brand-light)] active:translate-y-px",
  secondary: "bg-muted text-foreground hover:bg-[color-mix(in_srgb,var(--muted)_82%,var(--foreground))] active:translate-y-px",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:translate-y-px",
  text: "bg-transparent p-0 text-[var(--brand-light-on-light)] underline-offset-4 hover:underline",
  danger: "bg-destructive text-white hover:brightness-95 active:translate-y-px",
  // alias ของเดิม
  outline: "border border-border bg-card text-foreground hover:bg-muted active:translate-y-px",
  default: "bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)] hover:bg-[var(--brand-light)] active:translate-y-px"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11 p-0",
  "icon-sm": "h-9 w-9 p-0"
};

const base =
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[8px] font-semibold transition-[background,box-shadow,filter,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** สปินเนอร์ในปุ่ม — ปุ่มต้องไม่เปลี่ยนขนาด (ส่วนที่ 7) */
  loading?: boolean;
};

export function Button({ className, variant = "primary", size = "md", loading = false, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {/* เนื้อหาถูกซ่อนแต่ยังกินที่เท่าเดิม ปุ่มจึงไม่กระตุกตอน loading */}
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">กำลังทำงาน</span>
        </span>
      ) : null}
    </button>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ href, children, className, variant = "primary", size = "md", ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
