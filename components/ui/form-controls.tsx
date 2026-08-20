import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-[6px] border bg-card px-3 text-sm text-foreground transition-colors duration-[var(--dur-fast)] placeholder:text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60";

/*
 * No focus border here on purpose. The global `:focus-visible` rule already
 * draws a 2px ring in the same brand colour, so tinting the border as well
 * stacked two pink outlines around one field.
 */
const fieldTone = (invalid?: boolean) =>
  invalid
    ? "border-destructive"
    : "border-border hover:border-[var(--brand-emphasis)]";

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, fieldTone(invalid), "h-11", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, fieldTone(invalid), "min-h-28 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(fieldBase, fieldTone(invalid), "h-11 font-medium", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

export function FieldError({ children, id }: { children?: React.ReactNode; id?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {children}
    </p>
  );
}

export function Field({
  label,
  error,
  hint,
  children
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}
