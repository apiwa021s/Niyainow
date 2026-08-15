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
import { listReadingHistoryPage } from "@/services/user-service";

export const metadata: Metadata = { title: "ประวัติการอ่าน", robots: { index: false, follow: false } };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<CollectionSearchParams>;
}) {
  const requestedPage = parseCollectionPage((await searchParams).page);
  const pathname = "/history";
  const user = await requireActiveUser(collectionPageHref(pathname, requestedPage));
  const result = await listReadingHistoryPage(user.id, requestedPage);
  if (result.page !== requestedPage) redirect(collectionPageHref(pathname, result.page));

  return <PageShell><LibraryView mode="history" items={result.items} pagination={result} /></PageShell>;
}
