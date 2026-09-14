import Image from "next/image";

export type MangaPage = {
  pageNumber: number;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
};

export function MangaChapterBody({ pages, chapterNumber }: { pages: MangaPage[]; chapterNumber: number }) {
  if (pages.length === 0) {
    return <p className="rounded-[10px] bg-amber-500/10 p-4 text-center text-sm text-amber-700 dark:text-amber-300">ยังโหลดภาพของตอนนี้ไม่ได้ กรุณาลองเปิดใหม่อีกครั้ง</p>;
  }
  return (
    <div className="w-full bg-black" aria-label={`มังงะตอนที่ ${chapterNumber}`}>
      <div className="mx-auto grid w-full max-w-[760px] overflow-hidden">
        {pages.map((page, index) => (
          <Image
            key={page.pageNumber}
            src={page.url}
            alt={page.altText || `มังงะตอนที่ ${chapterNumber} หน้าที่ ${page.pageNumber}`}
            width={page.width ?? 790}
            height={page.height ?? 2184}
            sizes="(max-width: 760px) 100vw, 760px"
            className="block h-auto w-full"
            priority={index === 0}
            unoptimized
          />
        ))}
      </div>
    </div>
  );
}
