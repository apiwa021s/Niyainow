import { EmptyState } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";

/** 404 ของหลังบ้าน — เกิดตอนเปิดลิงก์นิยาย/ตอน/ผู้ใช้ที่ถูกลบไปแล้ว */
export default function AdminNotFound() {
  return (
    <EmptyState
      title="ไม่พบข้อมูลที่เปิด"
      description="รายการนี้อาจถูกลบไปแล้ว หรือลิงก์ที่ได้รับมาไม่ถูกต้อง ลองค้นหาจากหน้ารายการอีกครั้ง"
      action={
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href="/admin">กลับแดชบอร์ด</ButtonLink>
          <ButtonLink href="/admin/novels" variant="outline">
            ไปหน้าจัดการนิยาย
          </ButtonLink>
        </div>
      }
    />
  );
}
