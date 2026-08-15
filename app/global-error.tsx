"use client";

import Link from "next/link";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="th">
      <body>
        <style>{`
          :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
          body { margin: 0; background: #FAFAF8; color: #1D1B1B; }
          main { box-sizing: border-box; display: grid; min-height: 100vh; place-items: center; padding: 24px; }
          section { width: min(100%, 680px); border-block: 1px solid #E4E1DD; padding-block: 40px; text-align: center; }
          p { margin: 12px auto 0; max-width: 540px; line-height: 1.7; color: #615D59; }
          .kicker { margin: 0; color: #B51F32; font-size: 12px; font-weight: 700; letter-spacing: .12em; }
          h1 { margin: 10px 0 0; font-family: Georgia, serif; font-size: clamp(30px, 6vw, 46px); line-height: 1.3; }
          .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 24px; }
          button, a { box-sizing: border-box; display: inline-flex; min-height: 48px; align-items: center; justify-content: center; border-radius: 6px; padding: 0 20px; font: inherit; font-weight: 700; text-decoration: none; cursor: pointer; }
          button { border: 1px solid #B51F32; background: #B51F32; color: #FFF; }
          a { border: 1px solid #E4E1DD; color: inherit; }
          button:focus-visible, a:focus-visible { outline: 2px solid #B51F32; outline-offset: 3px; }
          @media (prefers-color-scheme: dark) {
            body { background: #0E0E10; color: #F0EDE9; }
            section, a { border-color: #2D2D34; }
            p { color: #B8B4B0; }
          }
        `}</style>
        <main id="main">
          <section aria-labelledby="global-error-title">
            <p className="kicker">NIYAITHAI / RECOVERY</p>
            <h1 id="global-error-title">ระบบเปิดหน้านี้ไม่สำเร็จ</h1>
            <p>ลองโหลดส่วนประกอบหลักอีกครั้ง หรือกลับหน้าแรกเพื่อเลือกนิยายโดยไม่เสี่ยงเสียข้อมูลที่บันทึกไว้</p>
            <div className="actions">
              <button type="button" onClick={retry}>ลองอีกครั้ง</button>
              <Link href="/">กลับหน้าแรก</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
