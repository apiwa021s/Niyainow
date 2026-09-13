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
    <div className="grid w-full overflow-hidden bg-black" aria-label={`มังงะตอนที่ ${chapterNumber}`}>
      {pages.map((page, index) => (
        <Image
          key={page.pageNumber}
          src={page.url}
          alt={page.altText || `มังงะตอนที่ ${chapterNumber} หน้าที่ ${page.pageNumber}`}
          width={page.width ?? 1600}
          height={page.height ?? 2400}
          sizes="100vw"
          className="block h-auto w-full max-w-none"
          priority={index === 0}
        />
      ))}
    </div>
  );
}
