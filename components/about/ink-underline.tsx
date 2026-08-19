import type { CSSProperties } from "react";
import styles from "./ink-draw.module.css";
import { cn } from "@/lib/utils";

/*
 * Three brush shapes so repeating this flourish down the page reads as a hand
 * re-drawing it, not one asset stamped four times. Each keeps the same loose,
 * single-stroke logic: a couple of relaxed curves, never a straight rule.
 */
const VARIANTS = {
  wave: "M4 14C42 4 82 18 118 9C154 0 190 15 216 7",
  swoop: "M6 5C64 2 132 3 182 12C196 14 204 15 214 11",
  flick: "M6 11C66 5 132 5 176 10C190 11.5 198 5 214 2"
} as const;

export function InkUnderline({
  className,
  delay = "0.35s",
  variant = "wave"
}: {
  className?: string;
  delay?: string;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <svg
      viewBox="0 0 220 20"
      aria-hidden
      focusable="false"
      className={cn("h-[0.5em] w-full text-brand-primary", className)}
      preserveAspectRatio="none"
    >
      <path
        className={styles.path}
        pathLength="100"
        d={VARIANTS[variant]}
        stroke="currentColor"
        strokeWidth={7}
        style={{ "--ink-delay": delay } as CSSProperties}
      />
    </svg>
  );
}
