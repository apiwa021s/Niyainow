import type { Metadata } from "next";
import type { ReactNode } from "react";

import { StudioShell } from "@/components/studio/studio-shell";
import { StudioThemeScript } from "@/components/studio/studio-theme-script";
import { StudioThemeProvider } from "@/components/studio/studio-theme";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = {
  title: {
    default: "สตูดิโอนักเขียน",
    template: "%s | สตูดิโอนักเขียน",
  },
  // Writer-only surface: never index it, even while the data is still mocked.
  robots: { index: false, follow: false },
};

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const user = await requireActiveUser("/studio");
  const profile = await getWriterProfileForUser(user.id);
  const displayName = profile?.displayName || user.name || "นักเขียน NovelNow";

  return (
    <>
      <StudioThemeScript />
      <StudioThemeProvider>
        <StudioShell viewer={{ displayName, username: profile?.username ?? null, initial: displayName.charAt(0).toUpperCase() }}>{children}</StudioShell>
      </StudioThemeProvider>
    </>
  );
}
