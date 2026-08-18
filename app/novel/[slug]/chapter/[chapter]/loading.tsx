import { Skeleton } from "@/components/ui/section";

export default function ReaderLoading() {
  return (
    <main id="main" className="min-h-screen bg-[var(--reader-paper,var(--background))]" aria-busy="true">
      <div className="sticky top-0 bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3 rounded-[8px] bg-card/70 px-2 py-1">
          <Skeleton className="h-11 w-11" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="h-11 w-11" />
        </div>
      </div>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-[8px] bg-card/55 px-5 py-8 text-center">
          <p role="status" className="editorial-kicker">READER / กำลังเปิดตอน</p>
          <Skeleton className="mx-auto mt-4 h-9 w-4/5 max-w-xl" />
          <div className="mx-auto mt-8 max-w-2xl space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            กำลังเตรียมเนื้อหาจากต้นฉบับ เมื่อพร้อมแล้วข้อความทั้งตอนจะแสดงโดยตรงในพื้นที่อ่านนี้
          </p>
        </div>
      </article>
    </main>
  );
}
