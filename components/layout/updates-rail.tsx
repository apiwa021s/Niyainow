import { cacheLife, cacheTag } from "next/cache";

import { UpdatesRailView } from "@/components/layout/updates-rail-view";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { getUpdates } from "@/services/novel-service";

/**
 * Right rail (brief §5.9 / §6.2). A live column of real chapter releases —
 * cover, novel, chapter, timestamp — all read straight from the catalogue.
 * It is the widest-value use of the desktop column that would otherwise be
 * empty margin, and it never scrolls the page: it scrolls itself.
 */
export async function UpdatesRail() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.discovery);
  cacheTag("public-chapters", "public-novels");

  const updates = await getUpdates("all", undefined, 24);
  return <UpdatesRailView updates={updates} />;
}
