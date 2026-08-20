import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "text" | "danger" | "outline" | "default";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)]",
  secondary: "bg-muted text-foreground hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-recessed)]",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:bg-[var(--bg-recessed)]",
  text: "bg-transparent p-0 text-[var(--brand-light-on-light)] underline-offset-4 hover:underline",
  danger: "bg-destructive text-white hover:brightness-95",
  outline: "border border-border bg-card text-foreground hover:bg-muted active:bg-[var(--bg-recessed)]",
  default: "bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)]"
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-11 w-11 p-0",
  "icon-sm": "h-11 w-11 p-0"
};

const base =
  "tap-target relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] font-semibold transition-[background-color,box-shadow,filter,transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ className, variant = "primary", size = "md", loading = false, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
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
