"use client";

import Image from "next/image";
import Link from "next/link";
import type { SteamFeaturedItem } from "@/lib/browse-types";
import { formatPrice } from "@/lib/utils";

interface BrowseGameTileProps {
  game: SteamFeaturedItem;
}

function BrowseGameTile({ game }: BrowseGameTileProps) {
  const price =
    game.final_price === 0
      ? "Free"
      : formatPrice(game.final_price, game.currency);

  return (
    <Link
      href={`/game/${game.id}`}
      className="group block overflow-hidden rounded-xl bg-steam-surface transition-all hover:ring-1 hover:ring-steam-accent/30"
    >
      <div className="relative aspect-[460/215] overflow-hidden">
        <Image
          src={game.header_image}
          alt={game.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 45vw, 200px"
        />
        {game.discounted && game.discount_percent > 0 && (
          <span className="absolute left-1.5 top-1.5 rounded-sm bg-[#4c6b22] px-1.5 py-0.5 text-[10px] font-medium text-[#beee11]">
            -{game.discount_percent}%
          </span>
        )}
      </div>
      <div className="space-y-0.5 p-2 lg:p-3">
        <p className="line-clamp-2 text-xs leading-snug text-steam-text-bright group-hover:text-steam-accent lg:text-[13px]">
          {game.name}
        </p>
        <p className="text-[11px] text-steam-muted">{price}</p>
      </div>
    </Link>
  );
}

interface BrowseSectionProps {
  title: string;
  games: SteamFeaturedItem[];
}

function BrowseSection({ title, games }: BrowseSectionProps) {
  if (games.length === 0) return null;

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header">{title}</div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3 lg:p-4 xl:grid-cols-6">
        {games.map((game) => (
          <BrowseGameTile key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}

interface BrowseCatalogProps {
  popular: SteamFeaturedItem[];
  newReleases: SteamFeaturedItem[];
  comingSoon: SteamFeaturedItem[];
  loading?: boolean;
}

export function BrowseCatalog({ popular, newReleases, comingSoon, loading }: BrowseCatalogProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="steam-panel rounded-sm p-2">
            <div className="mb-2 h-6 w-32 skeleton rounded-sm" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="aspect-[460/215] skeleton rounded-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <BrowseSection title="Popular Now" games={popular} />
      <BrowseSection title="New Releases" games={newReleases} />
      <BrowseSection title="Coming Soon" games={comingSoon} />
    </div>
  );
}
