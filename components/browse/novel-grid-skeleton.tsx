import { NOVEL_GRID_CLASS } from "@/components/novels/grid-layout";

/**
 * Skeleton ของ grid นิยาย (ส่วนที่ 7)
 * ใช้แทน spinner กลางจอ และรักษา aspect 2:3 ไว้เพื่อไม่ให้เกิด layout shift
 * ตอนของจริงมาแทนที่
 */
export function NovelGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul className={NOVEL_GRID_CLASS} aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="skeleton relative aspect-2/3 w-full overflow-hidden rounded-(--r-lg)">
            <div className="absolute inset-x-2 bottom-2 space-y-1.5">
              <div className="h-3.5 w-10/12 rounded bg-white/16" />
              <div className="h-2.5 w-7/12 rounded bg-white/10" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
