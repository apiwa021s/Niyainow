export const LEGACY_GENRE_REDIRECTS = {
  dark_romance: "romance",
  "dark-romance": "romance",
  supernatural: "fantasy",
  crime_thriller: "thriller",
  "crime-thriller": "thriller",
  scifi_apocalypse: "apocalypse",
  "sci-fi-apocalypse": "apocalypse",
  xianxia: "martial-arts",
  wuxia: "martial-arts",
  "school-life": "slice-of-life",
  game: "system",
  "online-game": "system",
  "boy-love": "romance",
  "girl-love": "romance",
  "teen-love": "romance",
  "idol-fanfic": "romance",
  "light-novel": "fantasy",
  urban: "contemporary",
  documentary: "historical",
} as const satisfies Record<string, string>;

export function canonicalGenreSlug(slug: string) {
  return LEGACY_GENRE_REDIRECTS[slug as keyof typeof LEGACY_GENRE_REDIRECTS] ?? slug;
}
