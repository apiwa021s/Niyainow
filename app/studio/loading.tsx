import { StudioPageSkeleton } from "@/components/studio/writer-studio-components";

export default function StudioLoading() {
  return <div aria-busy="true" aria-label="กำลังโหลดข้อมูลสตูดิโอ" className="grid gap-4"><StudioPageSkeleton /><StudioPageSkeleton /><StudioPageSkeleton /></div>;
}
