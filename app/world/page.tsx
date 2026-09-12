import { WorldExperience } from "@/components/world/WorldExperience";
import { requireActiveUser } from "@/lib/auth/dal";
import { pageMetadata } from "@/lib/seo";
import { getWorldCatalog, getWorldCharacter } from "@/services/world-service";

export const metadata = pageMetadata({
  title: "NovelNow World",
  description: "เดินทางในโลกมังงะของนักอ่าน พบผู้คน และเปิดนิยายจากห้องสมุด NovelNow Central",
  path: "/world",
  noIndex: true,
});

export default async function WorldPage() {
  const user = await requireActiveUser("/world");
  const [character, catalog] = await Promise.all([
    getWorldCharacter(user.id),
    getWorldCatalog(user.id),
  ]);
  return <WorldExperience initialCharacter={character} catalog={catalog} suggestedName={user.name} />;
}
