import type { Metadata } from "next";
import { NovelBrowser } from "@/components/interactive/novel-browser";
import { getNovels, parseGenreParam, type NovelQuery } from "@/services/novel-service";
import { genres as allGenres } from "@/data/mock-data";

type SearchParams = NovelQuery & { page?: string };

/** title/description สะท้อนตัวกรองที่เลือก เพื่อให้แต่ละลิงก์มี metadata ของตัวเอง (ส่วนที่ 6.4) */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const query = await searchParams;
  const selected = parseGenreParam(query.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter(Boolean);

  const title = selected.length ? `นิยาย${selected.join(" · ")}` : "นิยายทั้งหมด";
  const count = getNovels(query).length;

  return {
    title,
    description: `${title} บน NiyaiNow — ${count.toLocaleString("th-TH")} เรื่อง อัปเดตไว อ่านได้ทันที`
  };
}

export default async function NovelsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { page, ...query } = await searchParams;
  const initialPage = Math.max(1, Number(page) || 1);

  const selected = parseGenreParam(query.genre)
    .map((slug) => allGenres.find((genre) => genre.slug === slug)?.thaiName)
    .filter(Boolean);

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
      <NovelBrowser
        initialQuery={query}
        initialPage={initialPage}
        title={selected.length ? `นิยาย${selected.join(" · ")}` : "นิยายทั้งหมด"}
      />
    </main>
  );
}
