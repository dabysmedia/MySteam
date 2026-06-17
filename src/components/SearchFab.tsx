"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search } from "lucide-react";

export function SearchFab() {
  const pathname = usePathname();
  const onBrowse = pathname === "/search" || pathname.startsWith("/search");

  return (
    <Link
      href={onBrowse ? "/" : "/search"}
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-b from-[#7dd3fc] to-[#38bdf8] text-[#0a1628] active:scale-95 md:hidden"
      aria-label={onBrowse ? "Back to planner" : "Search games"}
      style={{
        boxShadow:
          "0 4px 24px rgba(56,189,248,0.35), 0 0 0 1px rgba(255,255,255,0.2) inset",
      }}
    >
      {onBrowse ? (
        <Home className="h-7 w-7" strokeWidth={2.25} />
      ) : (
        <Search className="h-7 w-7" strokeWidth={2.25} />
      )}
    </Link>
  );
}
