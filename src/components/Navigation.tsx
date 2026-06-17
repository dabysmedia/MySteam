"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { LibrarySync } from "@/components/LibrarySync";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const searchActive = pathname === "/search" || pathname.startsWith("/search");

  return (
    <aside className="hidden border-r border-steam-border bg-steam-dark md:flex md:w-56 md:flex-col lg:w-60">
      <nav className="flex flex-col gap-2 p-4 pt-8">
        <Link
          href="/search"
          className={cn(
            "steamos-nav-pill flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-semibold",
            searchActive
              ? "steamos-nav-pill-active text-steam-text-bright"
              : "text-steam-muted hover:bg-white/[0.04] hover:text-steam-text"
          )}
        >
          <Search className="h-5 w-5" strokeWidth={searchActive ? 2.25 : 1.75} />
          Search Games
        </Link>
      </nav>
      <div className="mt-auto border-t border-steam-border p-5 space-y-4">
        <LibrarySync />
        <p className="text-xs leading-relaxed text-steam-muted">
          Search Steam to find games, then add them to your planner.
        </p>
      </div>
    </aside>
  );
}
