import { redirect } from "next/navigation";

import {
  collectionPageHref,
  parseCollectionPage,
  type CollectionSearchParams,
} from "@/lib/validation/collection-pagination";

export default async function ReadingPage({
  searchParams,
}: {
  searchParams: Promise<CollectionSearchParams>;
}) {
  const page = parseCollectionPage((await searchParams).page);
  redirect(collectionPageHref("/library", page));
}
