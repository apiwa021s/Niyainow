/**
 * Skeleton ของ grid นิยาย (ส่วนที่ 7)
 * ใช้แทน spinner กลางจอ และรักษา aspect 2:3 ไว้เพื่อไม่ให้เกิด layout shift
 * ตอนของจริงมาแทนที่
 */
export function NovelGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="skeleton aspect-[2/3] w-full rounded-[12px]" />
          <div className="skeleton mt-2 h-4 w-11/12 rounded" />
          <div className="skeleton mt-1.5 h-3 w-2/3 rounded" />
          <div className="skeleton mt-1.5 h-4 w-1/2 rounded-[8px]" />
        </li>
      ))}
    </ul>
  );
}
