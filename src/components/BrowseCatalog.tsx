"use client";

import Link from "next/link";
import { EyeOff } from "lucide-react";
import type { SteamFeaturedItem } from "@/lib/browse-types";
import { steamHeaderImageUrl } from "@/lib/steam-app-details";
import { formatPrice } from "@/lib/utils";

interface BrowseGameTileProps {
  game: SteamFeaturedItem;
  unreleased?: boolean;
  onDismiss?: (game: SteamFeaturedItem) => void;
}

function BrowseGameTile({ game, unreleased, onDismiss }: BrowseGameTileProps) {
  const price =
    unreleased && game.final_price === 0
      ? "Coming Soon"
      : game.final_price === 0
        ? "Free"
        : formatPrice(game.final_price, game.currency);
  const imageSrc = game.header_image || steamHeaderImageUrl(game.id);

  return (
    <div className="group relative">
      <Link
        href={`/game/${game.id}`}
        className="block overflow-hidden rounded-xl bg-steam-surface transition-all hover:ring-1 hover:ring-steam-accent/30"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-steam-dark">
          <img
            src={imageSrc}
            alt={game.name}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = steamHeaderImageUrl(game.id);
            }}
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
      {onDismiss && (
        <button
          type="button"
          aria-label={`Hide ${game.name} from recommendations`}
          title="Not interested"
          onClick={() => onDismiss(game)}
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-steam-muted opacity-0 ring-1 ring-white/10 backdrop-blur-sm transition-all hover:bg-black/90 hover:text-steam-text-bright focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steam-accent group-hover:opacity-100"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface BrowseSectionProps {
  title: string;
  games: SteamFeaturedItem[];
  unreleased?: boolean;
  onDismiss?: (game: SteamFeaturedItem) => void;
}

function BrowseSection({ title, games, unreleased, onDismiss }: BrowseSectionProps) {
  if (games.length === 0) return null;

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header">{title}</div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-3 lg:p-4 xl:grid-cols-6">
        {games.map((game) => (
          <BrowseGameTile key={game.id} game={game} unreleased={unreleased} onDismiss={onDismiss} />
        ))}
      </div>
    </section>
  );
}

interface BrowseCatalogProps {
  popular: SteamFeaturedItem[];
  upcomingReleases: SteamFeaturedItem[];
  loading?: boolean;
  error?: string | null;
  onDismiss?: (game: SteamFeaturedItem) => void;
}

export function BrowseCatalog({ popular, upcomingReleases, loading, error, onDismiss }: BrowseCatalogProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="steam-panel rounded-sm p-2">
            <div className="mb-2 h-6 w-32 skeleton rounded-sm" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="aspect-[16/10] skeleton rounded-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && popular.length === 0 && upcomingReleases.length === 0) {
    return (
      <div className="steamos-panel mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-sm text-steam-muted">
          {error ?? "No curated games to show right now. Try searching for a title above."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      <BrowseSection title="Popular Now" games={popular} onDismiss={onDismiss} />
      <BrowseSection
        title="Upcoming Releases"
        games={upcomingReleases}
        unreleased
        onDismiss={onDismiss}
      />
    </div>
  );
}
