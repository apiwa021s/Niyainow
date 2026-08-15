import type { Metadata } from "next";
import { connection } from "next/server";

import { MongoSyncView } from "@/components/admin/views/mongo-sync-view";
import { getTranslatedNovelImportStatus } from "@/db/import-translated-novels";

export const metadata: Metadata = { title: "Mongo Sync" };

export default async function AdminMongoSyncPage() {
  await connection();
  const status = await getTranslatedNovelImportStatus();
  return <MongoSyncView initialStatus={status} />;
}
