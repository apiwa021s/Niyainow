import type { CSSProperties } from "react";
import styles from "./ink-draw.module.css";
import { cn } from "@/lib/utils";

/** A loose brush underline that draws in under a headline word. */
export function InkUnderline({ className, delay = "0.35s" }: { className?: string; delay?: string }) {
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
        d="M4 14C42 4 82 18 118 9C154 0 190 15 216 7"
        stroke="currentColor"
        strokeWidth={7}
        style={{ "--ink-delay": delay } as CSSProperties}
      />
    </svg>
  );
}
