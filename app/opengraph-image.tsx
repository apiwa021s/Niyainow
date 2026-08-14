import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site-config";

export const alt = `${siteConfig.name} — อ่านนิยายออนไลน์ภาษาไทย`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #140c26 0%, #4c1d95 58%, #db2777 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "76px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
          <div style={{ fontSize: 82, fontWeight: 800, letterSpacing: "-3px" }}>{siteConfig.name}</div>
          <div style={{ color: "#f5d0fe", fontSize: 40, lineHeight: 1.35, marginTop: "28px" }}>
            อ่านนิยายแปล นิยายออนไลน์ อัปเดตตอนใหม่ทุกวัน
          </div>
          <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.18)", borderRadius: "999px", fontSize: 24, marginTop: "46px", padding: "14px 24px" }}>
            Your next chapter, right now.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
