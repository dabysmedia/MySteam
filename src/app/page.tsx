"use client";

import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { useBacklog } from "@/hooks/useBacklog";
import { useEnrichedBacklog, getUpcomingGames } from "@/hooks/useEnrichedBacklog";
import { sortWishlistQueue } from "@/lib/backlog";
import { NowPlayingCard } from "@/components/NowPlayingCard";
import { PlayQueueTimeline } from "@/components/PlayQueueTimeline";
import { PlannerGameRow } from "@/components/PlannerGameRow";
import { parseReleaseDate } from "@/lib/release-date";

export default function PlannerPage() {
  const { games, hydrated, reorderQueue, setFeaturedArt } = useBacklog();
  const enriched = useEnrichedBacklog(games);

  const playing = enriched.filter((g) => g.status === "playing");
  const wantToPlay = enriched.filter((g) => g.status === "wishlist");
  const completed = enriched
    .filter((g) => g.status === "completed")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const upcoming = getUpcomingGames(wantToPlay);

  const queue = wantToPlay.filter((g) => {
    const parsed = parseReleaseDate(g.releaseDate, g.comingSoon);
    return !parsed?.isFuture;
  });

  const sortedQueue = sortWishlistQueue(queue);
  const heroGame = playing[0] ?? sortedQueue[0] ?? null;
  const heroVariant = playing[0] ? "playing" : sortedQueue[0] ? "next" : null;
  const heroAppId = heroVariant === "next" ? heroGame?.appId : undefined;
  const showQueuePanel = sortedQueue.length > 0 || upcoming.length > 0;

  if (!hydrated) {
    return (
      <div className="space-y-4 p-4 sm:p-0">
        <div className="aspect-[16/9] skeleton sm:rounded-sm" />
        <div className="h-48 skeleton rounded-sm" />
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center lg:min-h-[60vh]">
        <div className="max-w-sm space-y-6 lg:max-w-md lg:space-y-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-steam-accent/10">
            <Search className="h-8 w-8 text-steam-accent" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-steam-text-bright">Plan your next game</h1>
            <p className="text-sm text-steam-muted">
              Search Steam, pick what you want to play, and track your current game — all in one planner.
            </p>
          </div>
          <Link href="/search" className="btn-steam-green inline-flex items-center gap-2 px-8">
            <Search className="h-4 w-4" />
            Search Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden pb-5 sm:space-y-4 sm:pb-4 lg:space-y-6">
      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        <section className="lg:col-span-7 xl:col-span-8">
          {heroGame ? (
            <NowPlayingCard
              game={heroGame}
              variant={heroVariant ?? "playing"}
              onArtSelect={(url) => setFeaturedArt(heroGame.appId, url)}
            />
          ) : (
            <div className="mx-3 flex items-center justify-between gap-4 rounded-[var(--radius-steamos-lg)] border border-steam-border bg-steam-surface/40 px-4 py-3 sm:mx-0">
              <p className="text-sm text-steam-muted">Nothing queued yet</p>
              <Link href="/search" className="shrink-0 text-sm font-medium text-steam-link hover:text-steam-accent">
                Find a game
              </Link>
            </div>
          )}
        </section>

        {showQueuePanel && (
          <div className="space-y-4 px-3 sm:space-y-4 sm:px-0 lg:sticky lg:top-[4.75rem] lg:col-span-5 lg:self-start lg:px-0 xl:col-span-4">
            <PlayQueueTimeline
              queue={sortedQueue}
              upcoming={upcoming}
              heroAppId={heroAppId}
              onReorder={reorderQueue}
            />
          </div>
        )}
      </div>

      <div className="space-y-4 px-3 sm:space-y-4 sm:px-0">
        {completed.length > 0 && (
          <details className="steamos-panel group overflow-hidden" open>
            <summary className="steamos-section-header flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <span>Completed</span>
                <span className="steamos-chip steamos-chip-muted px-2 py-0.5 text-[10px]">
                  {completed.length}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-steam-muted transition-transform group-open:rotate-180" />
            </summary>
            <div>
              {completed.map((game) => (
                <PlannerGameRow key={game.appId} game={game} showCompleted />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
