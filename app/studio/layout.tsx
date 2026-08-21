import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StudioShell } from "@/components/studio/studio-shell";

export const metadata: Metadata = {
  title: {
    default: "สตูดิโอนักเขียน",
    template: "%s | สตูดิโอนักเขียน",
  },
  // Writer-only surface: never index it, even while the data is still mocked.
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
