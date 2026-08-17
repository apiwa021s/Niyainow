import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteChrome } from "@/components/layout/site-chrome";
import { UpdatesRail } from "@/components/layout/updates-rail";
import { getCurrentUser } from "@/lib/auth/dal";

/**
 * Session lookup is the only blocking read in the shell, so it suspends on its
 * own. Keeping it out of the shell's own signature means `children` is rendered
 * exactly once no matter how long the session takes.
 *
 * `connection()` opts this subtree out of prerendering: session decryption
 * reaches for `crypto.getRandomValues()`, which has no stable prerender value.
 * Everything outside this boundary — sidebar, rail, page content — still
 * prerenders, so the shell shell stays static and only the avatar waits.
 */
async function PersonalizedTopbar() {
  await connection();
  const currentUser = await getCurrentUser();
  const viewer = currentUser?.status === "ACTIVE"
    ? {
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
        role: currentUser.role,
      }
    : null;
  return <AppTopbar viewer={viewer} />;
}

/**
 * Three-column application shell: sidebar · content · rail.
 *
 * The content column takes every pixel the other two do not — no centred
 * max-width gutter on the sides, because empty margin is lost content
 * (brief §5.6). Each chrome piece hides itself on reader and admin routes via
 * SiteChrome, so the reader keeps its own quiet chrome untouched.
 *
 * Every chrome piece reads the URL (SiteChrome to decide whether to render at
 * all, the nav components to mark the active row), and URL data is only known
 * at request time. Each one therefore sits behind its own Suspense boundary so
 * the route around it still prerenders — `children` is never held back by the
 * chrome. Fallbacks are null rather than sized skeletons on purpose: on reader
 * and admin routes the chrome resolves to nothing, and a placeholder that
 * reserved space would collapse and shift the page.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-(--bg-base)">
      <Suspense fallback={null}>
        <SiteChrome>
          <AppSidebar />
        </SiteChrome>
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <SiteChrome>
            <Suspense fallback={<AppTopbar viewer={undefined} />}>
              <PersonalizedTopbar />
            </Suspense>
          </SiteChrome>
        </Suspense>

        {children}

        <Suspense fallback={null}>
          <SiteChrome>
            <Footer />
            <MobileBottomNav />
          </SiteChrome>
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <SiteChrome>
          <UpdatesRail />
        </SiteChrome>
      </Suspense>
    </div>
  );
}
