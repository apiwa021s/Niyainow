import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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
import { getGenres } from "@/services/novel-service";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.title} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [{ url: absoluteUrl("/og.png"), width: 1200, height: 630, alt: `${siteConfig.name} — ${siteConfig.title}` }]
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [absoluteUrl("/og.png")]
  },
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
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E10" }
  ]
};

const emptyMenuData: { genres: Awaited<ReturnType<typeof getGenres>> } = { genres: [] };

async function PersonalizedHeader() {
  const [genres, currentUser] = await Promise.all([getGenres(), getCurrentUser()]);
  const viewer = currentUser?.status === "ACTIVE"
    ? { name: currentUser.name, email: currentUser.email, role: currentUser.role }
    : null;

  return <Header menuData={{ genres }} viewer={viewer} />;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
            <Suspense fallback={null}>
              <SiteChrome>
                <Suspense fallback={<Header menuData={emptyMenuData} viewer={undefined} />}>
                  <PersonalizedHeader />
                </Suspense>
              </SiteChrome>
            </Suspense>
            {children}
            <Suspense fallback={null}>
              <SiteChrome>
                <Footer />
                <MobileBottomNav />
              </SiteChrome>
            </Suspense>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
