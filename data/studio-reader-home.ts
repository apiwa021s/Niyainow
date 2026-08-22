import {
  studioChapters,
  studioProfile,
  studioWorks,
  type StudioWork,
} from "@/components/studio/mock-data";
import type { NovelUpdate, PromoBannerItem } from "@/services/novel-service";
import type { HomePersonalization } from "@/services/user-service";
import type { Genre, Novel } from "@/types/novel";

const workArtwork: Record<string, { cover: string; backdrop: string; synopsis: string }> = {
  "reborn-as-a-warlord": {
    cover: "/Images/genre/action.png",
    backdrop: "/Images/genre/action.png",
    synopsis: "นายทหารหน่วยรบพิเศษย้อนกลับไปสู่ยุคสามก๊ก และต้องสร้างชื่อในร่างของลิโป้ท่ามกลางศึกชิงแผ่นดิน",
  },
  "alchemy-empress": {
    cover: "/Images/genre/fantasy.png",
    backdrop: "/Images/genre/fantasy.png",
    synopsis: "คุณหนูผู้ถูกตราหน้าว่าไร้ค่าใช้ศาสตร์โอสถและพลังสัตว์เทพ พลิกชะตากลับขึ้นสู่จุดสูงสุด",
  },
  "system-of-a-thousand-lives": {
    cover: "/Images/genre/system.png",
    backdrop: "/Images/genre/system.png",
    synopsis: "ระบบลึกลับมอบชีวิตใหม่ซ้ำแล้วซ้ำเล่า แต่ทุกการเกิดใหม่กำลังพาเขาเข้าใกล้ความจริงที่อันตราย",
  },
  "quiet-city-diary": {
    cover: "/Images/genre/investigate.png",
    backdrop: "/Images/genre/investigate.png",
    synopsis: "บันทึกจากเมืองที่เงียบลงทุกคืน เมื่อความทรงจำของผู้คนเริ่มหายไปทีละหน้า",
  },
};

const genreSlugByLabel: Record<string, string> = {
  "ย้อนยุค": "historical",
  "สงคราม": "war",
  "แฟนตาซี": "fantasy",
  "ไซไฟ": "sci-fi",
  "ร่วมสมัย": "contemporary",
};

function genreParts(value: string) {
  return value.split(/[•·]/u).map((part) => part.trim()).filter(Boolean);
}

function genreSlug(label: string) {
  return genreSlugByLabel[label] ?? label.toLocaleLowerCase("en").replace(/\s+/gu, "-");
}

function publicStatus(status: StudioWork["status"]): Novel["status"] {
  if (status === "completed") return "completed";
  if (status === "hiatus") return "hiatus";
  return "ongoing";
}

function latestChapterFor(work: StudioWork) {
  if (work.slug === "reborn-as-a-warlord") {
    const chapter = studioChapters
      .filter((item) => item.status === "published" && !item.memberOnly)
      .sort((a, b) => b.number - a.number)[0];
    if (chapter) return { number: chapter.number, title: chapter.title };
  }
  return work.chapters > 0
    ? { number: work.chapters, title: `ตอนที่ ${work.chapters.toLocaleString("th-TH")}` }
    : undefined;
}

function tagsFor(work: StudioWork) {
  if (work.slug === "reborn-as-a-warlord") return ["war", "strategy", "second-chance"];
  if (work.slug === "alchemy-empress") return ["alchemy", "revenge", "strong-lead"];
  if (work.slug === "system-of-a-thousand-lives") return ["system", "time-loop", "survival"];
  return ["mystery", "slow-burn"];
}

function toNovel(work: StudioWork, index: number): Novel {
  const artwork = workArtwork[work.slug] ?? workArtwork["quiet-city-diary"];
  const genres = genreParts(work.genreLabel);
  const latestChapter = latestChapterFor(work);
  return {
    slug: work.slug,
    title: work.title,
    thaiTitle: work.title,
    author: studioProfile.penName,
    authorSlug: studioProfile.handle.replace(/^@/u, ""),
    genres: genres.map(genreSlug),
    genreNames: Object.fromEntries(genres.map((label) => [genreSlug(label), label])),
    tags: tagsFor(work),
    status: publicStatus(work.status),
    rating: Number((4.9 - index * 0.1).toFixed(1)),
    ratingCount: Math.max(24, Math.round(work.reads / 3200)),
    reviewCount: Math.max(8, Math.round(work.reads / 14000)),
    views: work.reads,
    chapters: work.chapters,
    synopsis: artwork.synopsis,
    cover: artwork.cover,
    backdrop: artwork.backdrop,
    updatedAt: work.updatedAt,
    featured: index === 0,
    completed: work.status === "completed",
    bookmarkCount: work.followers,
    latestChapterTitle: latestChapter?.title,
    isNew: index === 1,
    hasPaidChapters: work.defaultAccess === "paid",
    updatedHoursAgo: index === 0 ? 2 : index === 1 ? 24 : index === 2 ? 72 : 168,
    publishedAt: "2026-08-01T12:00:00.000Z",
    latestChapter,
  };
}

export const studioHomeNovels = studioWorks.map(toNovel);
export const studioHomePublishedNovels = studioHomeNovels.filter((_, index) => {
  const status = studioWorks[index].status;
  return status === "published" || status === "completed" || status === "hiatus";
});

const genreCounts = new Map<string, { label: string; count: number }>();
for (const novel of studioHomePublishedNovels) {
  for (const slug of novel.genres) {
    const label = novel.genreNames?.[slug] ?? slug;
    genreCounts.set(slug, { label, count: (genreCounts.get(slug)?.count ?? 0) + 1 });
  }
}

export const studioHomeGenres: Genre[] = [...genreCounts].map(([slug, { label, count }]) => ({
  slug,
  name: label,
  thaiName: label,
  description: `ผลงานแนว ${label} จาก ${studioProfile.penName}`,
  count,
}));

export const studioHomeGenreShowcase = studioHomeGenres.map((genre) => ({
  genre,
  covers: studioHomePublishedNovels
    .filter((novel) => novel.genres.includes(genre.slug))
    .map((novel) => novel.cover),
}));

const flagship = studioHomePublishedNovels[0];
const earlyAccessChapter = studioChapters.find((chapter) => chapter.earlyAccessNote);

export const studioHomeBanners: PromoBannerItem[] = [
  ...studioHomePublishedNovels.map((novel, index) => ({
    id: `studio-${novel.slug}`,
    title: novel.thaiTitle,
    subtitle: index === 0
      ? `${studioProfile.penName} · ${novel.genreNames?.[novel.genres[0]] ?? "นิยาย"} · ${novel.chapters.toLocaleString("th-TH")} ตอน`
      : `${novel.genreNames?.[novel.genres[0]] ?? "นิยาย"} · อัปเดต ${novel.updatedAt}`,
    image: novel.backdrop,
    linkUrl: `/novel/${novel.slug}`,
    ctaLabel: "เริ่มอ่าน",
  })),
  ...(flagship && earlyAccessChapter ? [{
    id: "studio-early-access",
    title: `${earlyAccessChapter.title} · สมาชิกอ่านก่อน`,
    subtitle: `${earlyAccessChapter.earlyAccessNote} · ${earlyAccessChapter.publicReleaseNote}`,
    image: flagship.backdrop,
    linkUrl: `/novel/${flagship.slug}/chapter/${earlyAccessChapter.number}`,
    ctaLabel: "ดูตอนใหม่",
  }] : []),
];

function updateFor(novel: Novel, index: number): NovelUpdate {
  const flagshipChapter = index === 0
    ? studioChapters
      .filter((chapter) => chapter.status === "published" && !chapter.memberOnly)
      .sort((a, b) => b.number - a.number)[0]
    : undefined;
  return {
    novelSlug: novel.slug,
    chapter: flagshipChapter?.number ?? novel.latestChapter?.number ?? novel.chapters,
    chapterTitle: flagshipChapter?.title ?? novel.latestChapter?.title ?? "ตอนใหม่",
    time: novel.updatedAt,
    novel,
    publishedAt: `2026-08-${String(22 - index).padStart(2, "0")}T13:00:00.000Z`,
  };
}

export const studioHomeUpdates = studioHomePublishedNovels.map(updateFor);

const firstNovel = studioHomePublishedNovels[0];
export const studioHomePersonalization: HomePersonalization = {
  continueReading: firstNovel ? [{
    novel: firstNovel,
    libraryStatus: "READING",
    progressPercent: 64,
    position: 1820,
    chapter: {
      number: firstNovel.latestChapter?.number ?? 1,
      slug: String(firstNovel.latestChapter?.number ?? 1),
      title: firstNovel.latestChapter?.title ?? "ตอนล่าสุด",
    },
    lastReadAt: "2026-08-22T11:30:00.000Z",
  }] : [],
  followedNovelSlugs: studioHomePublishedNovels.map((novel) => novel.slug),
};

export const studioHomeData = {
  newThisWeek: [...studioHomePublishedNovels].reverse(),
  recommended: studioHomePublishedNovels,
  completed: studioHomeNovels.filter((novel) => novel.status === "completed"),
  rankings: studioHomePublishedNovels,
  rankingsDaily: [...studioHomePublishedNovels].sort((a, b) => b.views - a.views),
  rankingsMonthly: [...studioHomePublishedNovels].sort(
    (a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0),
  ),
  updates: studioHomeUpdates,
  genreShowcase: studioHomeGenreShowcase,
};
