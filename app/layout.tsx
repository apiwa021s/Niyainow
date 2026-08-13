import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { ThemeProvider } from "@/components/interactive/theme-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ToastProvider } from "@/components/ui/toast";
import { getFeaturedNovels, getGenres } from "@/services/novel-service";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NiyaiNow | นิยายใหม่ อัปเดตไว อ่านได้ทันที",
    template: "%s | NiyaiNow"
  },
  description: "แพลตฟอร์มอ่านนิยายสำหรับตลาดไทย พร้อมค้นหา คลังส่วนตัว ประวัติ และ reader controls",
  metadataBase: new URL("https://niyainow.local"),
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#120A24" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={fontVariables} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <a href="#main" className="skip-link">
              ข้ามไปยังเนื้อหาหลัก
            </a>
            <SiteChrome>
              <Header menuData={{ genres: getGenres(), promo: getFeaturedNovels()[0] }} />
            </SiteChrome>
            {children}
            <SiteChrome>
              <Footer />
              <MobileBottomNav />
            </SiteChrome>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
