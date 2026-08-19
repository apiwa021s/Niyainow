import styles from "./ink-logo-loader.module.css";

/**
 * Lightweight route-loading mark. The two paths redraw the NovelNow NN as
 * ink without client JavaScript or an additional image request.
 */
export function InkLogoLoader() {
  return (
    <div className={styles.root} aria-hidden>
      <svg className={styles.mark} viewBox="0 0 108 64" focusable="false">
        <path
          className={`${styles.bleed} ${styles.ink}`}
          pathLength="100"
          d="M14 51V15c0-4 4-5 7-1l27 34c3 4 7 2 7-3V13"
        />
        <path
          className={`${styles.line} ${styles.ink}`}
          pathLength="100"
          d="M14 51V15c0-4 4-5 7-1l27 34c3 4 7 2 7-3V13"
        />
        <path
          className={`${styles.bleed} ${styles.accent}`}
          pathLength="100"
          d="M55 13c0-4 4-5 7-1l27 36c3 4 7 2 7-3V13"
        />
        <path
          className={`${styles.line} ${styles.accent}`}
          pathLength="100"
          d="M55 13c0-4 4-5 7-1l27 36c3 4 7 2 7-3V13"
        />
      </svg>
    </div>
  );
}
