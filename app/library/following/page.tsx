import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LibraryView } from "@/components/interactive/library-view";
import { PageShell } from "@/components/ui/section";
import { requireActiveUser } from "@/lib/auth/dal";
import {
  collectionPageHref,
  parseCollectionPage,
  type CollectionSearchParams,
} from "@/lib/validation/collection-pagination";
import { listFollowedNovelsPage } from "@/services/user-service";

export const metadata: Metadata = { title: "นิยายที่ติดตาม", robots: { index: false, follow: false } };

export default async function FollowingPage({
  searchParams,
}: {
  searchParams: Promise<CollectionSearchParams>;
}) {
  const requestedPage = parseCollectionPage((await searchParams).page);
  const pathname = "/library/following";
  const user = await requireActiveUser(collectionPageHref(pathname, requestedPage));
  const result = await listFollowedNovelsPage(user.id, requestedPage);
  if (result.page !== requestedPage) redirect(collectionPageHref(pathname, result.page));

  return <PageShell><LibraryView mode="following" items={result.items} pagination={result} /></PageShell>;
}
