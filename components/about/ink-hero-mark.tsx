import type { CSSProperties } from "react";
import styles from "./ink-draw.module.css";
import { cn } from "@/lib/utils";

const STROKE_ONE = "M14 51V15c0-4 4-5 7-1l27 34c3 4 7 2 7-3V13";
const STROKE_TWO = "M55 13c0-4 4-5 7-1l27 36c3 4 7 2 7-3V13";

/**
 * The NN brand mark, redrawn as two ink strokes — same paths as the route
 * loader (components/ui/ink-logo-loader.tsx), but played once and left
 * standing instead of looping, so it reads as this page's opening flourish.
 */
export function InkHeroMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 108 64"
      className={cn("h-auto w-full overflow-visible text-brand-ink", className)}
      role="img"
      aria-label="NovelNow"
    >
      <path className={cn(styles.path, styles.bleed)} pathLength="100" strokeWidth={11} d={STROKE_ONE} stroke="currentColor" />
      <path className={styles.path} pathLength="100" strokeWidth={7} d={STROKE_ONE} stroke="currentColor" />
      <path
        className={cn(styles.path, styles.bleed, "text-brand-primary")}
        pathLength="100"
        strokeWidth={11}
        d={STROKE_TWO}
        stroke="currentColor"
        style={{ "--ink-delay": "0.45s" } as CSSProperties}
      />
      <path
        className={cn(styles.path, "text-brand-primary")}
        pathLength="100"
        strokeWidth={7}
        d={STROKE_TWO}
        stroke="currentColor"
        style={{ "--ink-delay": "0.45s" } as CSSProperties}
      />
    </svg>
  );
}
