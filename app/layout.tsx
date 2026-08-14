import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import { ThemeProvider } from "@/components/interactive/theme-provider";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { SiteChrome } from "@/components/layout/site-chrome";
import { ToastProvider } from "@/components/ui/toast";
import { JsonLd } from "@/components/seo/json-ld";
import { getCurrentUser } from "@/lib/auth/dal";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { getFeaturedNovels, getGenres } from "@/services/novel-service";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.title} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [genres, featured, currentUser] = await Promise.all([
    getGenres(),
    getFeaturedNovels(),
    getCurrentUser()
  ]);
  const viewer = currentUser?.status === "ACTIVE"
    ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
    : null;

  return (
    <html lang="th" className={fontVariables} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <JsonLd
              data={{
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: siteConfig.name,
                url: absoluteUrl("/"),
                inLanguage: "th",
                potentialAction: {
                  "@type": "SearchAction",
                  target: `${absoluteUrl("/search")}?q={search_term_string}`,
                  "query-input": "required name=search_term_string"
                }
              }}
            />
            <a href="#main" className="skip-link">
              ข้ามไปยังเนื้อหาหลัก
            </a>
            <SiteChrome>
              <Header menuData={{ genres, promo: featured[0] }} viewer={viewer} />
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
