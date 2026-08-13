export type NovelStatus = "ongoing" | "completed" | "hiatus";

export type Genre = {
  slug: string;
  name: string;
  thaiName: string;
  description: string;
  count: number;
};

export type Novel = {
  slug: string;
  title: string;
  thaiTitle: string;
  author: string;
  genres: string[];
  tags: string[];
  status: NovelStatus;
  rating: number;
  views: number;
  chapters: number;
  synopsis: string;
  cover: string;
  backdrop: string;
  updatedAt: string;
  featured?: boolean;
  completed?: boolean;
};

export type Chapter = {
  novelSlug: string;
  number: number;
  title: string;
  body: string[];
  updatedAt: string;
};

export type UpdateItem = {
  novelSlug: string;
  chapter: number;
  chapterTitle: string;
  time: string;
};

export type ReadingRecord = {
  novelSlug: string;
  chapter: number;
  progress: number;
  updatedAt: string;
};

export type SearchResultGroup = {
  novels: Novel[];
  genres: Genre[];
  tags: string[];
};
