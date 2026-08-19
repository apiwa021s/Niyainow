"use client";

import { Bookmark } from "lucide-react";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

const BookmarkToggle = dynamic(
  () => import("@/components/interactive/novel-actions").then((module) => module.BookmarkToggle),
  {
    loading: () => (
      <span
        aria-hidden
        className="grid h-12 w-12 place-items-center rounded-[6px] bg-black/72 text-white/70"
      >
        <Bookmark className="h-4 w-4" />
      </span>
    ),
  },
);

function subscribeToDesktop(change: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/**
 * Grid bookmarks only exist on desktop. Avoid downloading the full novel
 * actions module on phones, where the control is hidden and cannot be used.
 */
export function DeferredBookmarkToggle({ slug }: { slug: string }) {
  const desktop = useSyncExternalStore(subscribeToDesktop, getDesktopSnapshot, () => false);
  return desktop ? <BookmarkToggle slug={slug} /> : null;
}
