"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Planner", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/search",
    label: "Search",
    icon: Search,
    match: (path: string) => path === "/search" || path.startsWith("/search"),
  },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-white/[0.08] text-steam-text-bright"
                : "text-steam-muted hover:bg-white/[0.04] hover:text-steam-text"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
