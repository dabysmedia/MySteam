import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Inter } from "next/font/google";
import { Logo } from "@/components/Logo";
import { BacklogSyncProvider } from "@/components/BacklogSyncProvider";
import { LibrarySync } from "@/components/LibrarySync";
import { Sidebar } from "@/components/Navigation";
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
        <div className="flex min-h-dvh w-full max-w-[100vw] overflow-x-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-40 glass">
              <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-14 sm:px-6">
                <Logo />
                <div className="flex items-center gap-2">
                  <div className="md:hidden">
                    <LibrarySync compact />
                  </div>
                  <Link
                  href="/search"
                  className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-steam-muted transition-colors hover:bg-white/[0.05] hover:text-steam-accent md:flex"
                >
                  <Search className="h-4 w-4" />
                  Search
                </Link>
                </div>
              </div>
            </header>
            <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-hidden px-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5 md:pb-6">
              {children}
            </main>
            <SearchFab />
          </div>
        </div>
        </BacklogSyncProvider>
      </body>
    </html>
  );
}
