import { CircleDollarSign, LockKeyhole } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WalletView() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5" />ระบบชำระเงินยังไม่เปิดใช้งาน</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          NiyaiNow ยังไม่มีบริการเติมเหรียญ ซื้อแพ็กเกจ หรือปลดล็อกตอน จึงไม่มีการเรียกเก็บเงินหรือยอดคงเหลือในบัญชี
        </p>
        <p className="flex items-center gap-2 text-sm font-medium">
          <LockKeyhole className="h-4 w-4" /> จะเปิดใช้งานเมื่อระบบชำระเงินจริงและเงื่อนไขการคืนเงินพร้อมใช้งานเท่านั้น
        </p>
      </CardContent>
    </Card>
  );
}
