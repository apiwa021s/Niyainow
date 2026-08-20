"use client";

import { useEffect, useState } from "react";

const TOP_EDGE = 24;
const DIRECTION_THRESHOLD = 8;

export function useScrollChromeVisibility() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame: number | null = null;

    const sample = () => {
      frame = null;
      const nextY = window.scrollY;
      const delta = nextY - lastY;

      if (nextY <= TOP_EDGE || delta < -DIRECTION_THRESHOLD) setVisible(true);
      else if (delta > DIRECTION_THRESHOLD) setVisible(false);

      lastY = nextY;
    };

    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(sample);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return visible;
}
