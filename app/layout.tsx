import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Noto_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import { ThemeProvider } from "@/components/interactive/theme-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap"
});

const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-noto-serif-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap"
});

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
  themeColor: "#070B17"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={`${notoSansThai.variable} ${notoSerifThai.variable} ${jetBrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Header />
          {children}
          <Footer />
          <MobileBottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
