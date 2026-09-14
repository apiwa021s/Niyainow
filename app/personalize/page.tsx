import type { Metadata } from "next";

import { PersonalizedReaderPage } from "@/components/onboarding/personalized-reader-page";
import {
  getCompletedNovels,
  getNewThisWeek,
  getRankings,
  getRecommendedNovels,
} from "@/services/novel-service";
import type { Novel } from "@/types/novel";
import { getCurrentUser } from "@/lib/auth/dal";
import { getReaderClassProfile } from "@/services/reader-class-service";

export const metadata: Metadata = {
  title: "โลกนิยายที่สร้างเพื่อคุณ",
  description: "คำแนะนำนิยายและเส้นทางการอ่านที่สร้างจาก Main Class, Sub Class และนิสัยการอ่านของคุณ",
};

function uniqueNovels(groups: Novel[][]) {
  const novels = new Map<string, Novel>();
  for (const group of groups) {
    for (const novel of group) {
      if (!novels.has(novel.slug)) novels.set(novel.slug, novel);
    }
  }
  return [...novels.values()];
}

export default async function PersonalizePage() {
  const [groups, readerClassContext] = await Promise.all([
    Promise.all([
      getRecommendedNovels(24),
      getNewThisWeek(24),
      getCompletedNovels(24),
      getRankings("WEEKLY", 24),
    ]),
    (async () => {
      const currentUser = await getCurrentUser();
      const canPersist = currentUser?.status === "ACTIVE";
      return {
        canPersist,
        profile: canPersist ? await getReaderClassProfile(currentUser.id) : null,
      };
    })(),
  ]);

  return (
    <PersonalizedReaderPage
      novels={uniqueNovels(groups)}
      initialProfile={readerClassContext.profile}
      canPersist={readerClassContext.canPersist}
    />
  );
}
