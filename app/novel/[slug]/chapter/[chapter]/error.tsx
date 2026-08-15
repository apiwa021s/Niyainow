"use client";

import { BookOpen, List, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";

function novelSlugFromPathname(pathname: string | null) {
  if (!pathname) return null;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "novel" || segments[2] !== "chapter" || !segments[1]) return null;

  try {
    const slug = decodeURIComponent(segments[1]);
    if (!slug || slug.length > 180 || /[\u0000-\u001f\u007f/\\?#]/u.test(slug)) return null;
    return slug;
  } catch {
    return null;
  }
}

export default function ChapterError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const slug = novelSlugFromPathname(pathname);
  const encodedSlug = slug ? encodeURIComponent(slug) : null;
  const novelHref = encodedSlug ? `/novel/${encodedSlug}` : "/novels";
  const chaptersHref = encodedSlug ? `/novel/${encodedSlug}/chapters` : "/novels";

  return (
    <main id="main" className="grid min-h-[72vh] place-items-center bg-background px-5 py-16 text-foreground">
      <section aria-labelledby="chapter-error-title" className="w-full max-w-xl rounded-[8px] border border-border bg-card p-6 text-center shadow-[var(--sh-1)] sm:p-8">
        <p className="editorial-kicker">READER / RECOVERY</p>
        <h1 id="chapter-error-title" className="mt-2 font-serif text-3xl font-semibold">เปิดตอนนี้ไม่สำเร็จ</h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">
          การเชื่อมต่อหรือข้อมูลตอนอาจมีปัญหาชั่วคราว ลองโหลดอีกครั้ง หรือกลับไปเลือกตอนจากสารบัญ
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Button onClick={retry} className="min-h-11">
            <RotateCcw className="h-4 w-4" /> ลองอีกครั้ง
          </Button>
          <ButtonLink href={novelHref} variant="outline" className="min-h-11">
            <BookOpen className="h-4 w-4" /> {slug ? "หน้าเรื่อง" : "เลือกนิยาย"}
          </ButtonLink>
          <ButtonLink href={chaptersHref} variant="outline" className="min-h-11">
            <List className="h-4 w-4" /> {slug ? "สารบัญตอน" : "ดูนิยายทั้งหมด"}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
