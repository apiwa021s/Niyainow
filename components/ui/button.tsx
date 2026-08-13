import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  default: "bg-primary text-primary-foreground shadow-[0_14px_34px_rgba(109,40,255,0.34)] hover:bg-[#5c20dc] active:translate-y-px",
  secondary: "border border-white/8 bg-secondary text-secondary-foreground shadow-sm hover:bg-white/10 active:translate-y-px",
  ghost: "bg-transparent text-muted-foreground hover:bg-white/8 hover:text-foreground active:translate-y-px",
  outline: "border border-border bg-background/25 text-foreground hover:border-white/18 hover:bg-white/8 active:translate-y-px",
  danger: "bg-destructive text-white hover:brightness-95 active:translate-y-px"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0"
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  children,
  className,
  variant = "default",
  size = "md"
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </Link>
  );
}
