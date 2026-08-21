import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const timeLabel = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

/**
 * No auto-merge, ever (spec §8/§28) — a silent merge of two versions the
 * writer can't see is how half a paragraph quietly disappears. The writer
 * picks one whole version.
 */
export function DraftRecoveryDialog({
  open,
  localSavedAt,
  serverSavedAt,
  onUseLocal,
  onUseServer,
}: {
  open: boolean;
  localSavedAt: number;
  serverSavedAt: number;
  onUseLocal: () => void;
  onUseServer: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onUseServer}
      title="พบข้อความที่ยังไม่ได้ซิงก์"
      description="เราเก็บข้อความล่าสุดไว้บนอุปกรณ์นี้ เลือกเวอร์ชันที่จะใช้ต่อ"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onUseServer}>
            ใช้เวอร์ชันบน Server · {timeLabel(serverSavedAt)}
          </Button>
          <Button variant="primary" onClick={onUseLocal}>
            กู้คืนข้อความล่าสุด · {timeLabel(localSavedAt)}
          </Button>
        </>
      }
    />
  );
}
