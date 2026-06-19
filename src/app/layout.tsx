import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Logo } from "@/components/Logo";
import { BacklogSyncProvider } from "@/components/BacklogSyncProvider";
import { LibrarySync } from "@/components/LibrarySync";
import { TopNav } from "@/components/Navigation";
import { SearchFab } from "@/components/SearchFab";
import { ServiceWorkerCleanup } from "@/components/ServiceWorkerCleanup";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MySteam — Game Planner",
  description: "Plan what to play next. Track your current game, wishlist, and upcoming releases.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icon-512.png", type: "image/png" }],
    apple: [{ url: "/icon-192.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MySteam",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="no-scrollbar-x">
        <BacklogSyncProvider>
          <ServiceWorkerCleanup />
          <div className="flex min-h-dvh flex-col overflow-x-clip lg:px-[30px]">
            <header className="sticky top-0 z-40 glass pt-[env(safe-area-inset-top)]">
              <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:mx-0 lg:max-w-none lg:px-2">
                <div className="flex min-w-0 items-center gap-6">
                  <Logo />
                  <TopNav />
                </div>
                <LibrarySync compact />
              </div>
            </header>
            <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-clip px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5 md:pb-6 lg:mx-0 lg:max-w-none lg:overflow-visible lg:px-2 lg:pt-6">
              {children}
            </main>
            <SearchFab />
          </div>
        </BacklogSyncProvider>
      </body>
    </html>
  );
}
