import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";

export default function NotFound() {
  return (
    <PageShell className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="text-sm text-[var(--brand-accent)]">404</p>
        <h1 className="mt-2 text-3xl font-semibold">ไม่พบหน้าที่ต้องการ</h1>
        <p className="mt-2 text-muted-foreground">ลิงก์นี้อาจถูกย้าย หรือยังไม่มีนิยายในเส้นทางนี้</p>
        <ButtonLink className="mt-5" href="/">กลับหน้าแรก</ButtonLink>
      </div>
    </PageShell>
  );
}
