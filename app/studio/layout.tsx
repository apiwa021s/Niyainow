import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StudioShell } from "@/components/studio/studio-shell";
import { StudioThemeScript } from "@/components/studio/studio-theme-script";
import { StudioThemeProvider } from "@/components/studio/studio-theme";

export const metadata: Metadata = {
  title: {
    default: "สตูดิโอนักเขียน",
    template: "%s | สตูดิโอนักเขียน",
  },
  // Writer-only surface: never index it, even while the data is still mocked.
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StudioThemeScript />
      <StudioThemeProvider>
        <StudioShell>{children}</StudioShell>
      </StudioThemeProvider>
    </>
  );
}
