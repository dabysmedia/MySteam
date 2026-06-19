"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { BrowseCatalog } from "@/components/BrowseCatalog";
import { GameCard } from "@/components/GameCard";
import { SkeletonCard } from "@/components/Skeleton";
import { useBacklog } from "@/hooks/useBacklog";
import { useDismissedGames } from "@/hooks/useDismissedGames";
import { getBacklog } from "@/lib/backlog";
import type { SteamBrowseResponse, SteamFeaturedItem } from "@/lib/browse-types";
import type { BacklogStatus, SteamSearchItem } from "@/lib/types";
import { selectBrowseGames } from "@/lib/browse-sort-client";
import { formatPrice } from "@/lib/utils";

const BROWSE_EXCLUDED_STATUSES: BacklogStatus[] = ["wishlist", "playing", "completed"];

function BrowseContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SteamSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(Boolean(initialQuery));

  const [catalog, setCatalog] = useState<SteamBrowseResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const { games: backlogGames } = useBacklog();
  const { dismissedAppIds, dismiss } = useDismissedGames();

  const excludedBacklogAppIds = useMemo(() => {
    const source = backlogGames.length > 0 ? backlogGames : getBacklog();
    return new Set(
      source
        .filter((game) => BROWSE_EXCLUDED_STATUSES.includes(game.status))
        .map((game) => game.appId)
    );
  }, [backlogGames]);

  const hiddenBrowseAppIds = useMemo(() => {
    const hidden = new Set<number>();
    for (const appId of excludedBacklogAppIds) hidden.add(appId);
    for (const appId of dismissedAppIds) hidden.add(appId);
    return hidden;
  }, [dismissedAppIds, excludedBacklogAppIds]);

  const popular = useMemo(
    () => selectBrowseGames(catalog?.popular ?? [], hiddenBrowseAppIds, "popular"),
    [catalog?.popular, hiddenBrowseAppIds]
  );

  const upcomingReleases = useMemo(
    () => selectBrowseGames(catalog?.upcomingReleases ?? [], hiddenBrowseAppIds, "upcoming"),
    [catalog?.upcomingReleases, hiddenBrowseAppIds]
  );

  const handleDismiss = useCallback(
    (game: SteamFeaturedItem) => {
      dismiss(game.id, game.name);
    },
    [dismiss]
  );

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/steam/browse");
        if (!res.ok) throw new Error("browse failed");
        const data = (await res.json()) as SteamBrowseResponse;
        setCatalog(data);
        setCatalogError(null);
      } catch {
        setCatalog({ popular: [], upcomingReleases: [] });
        setCatalogError("Could not load curated games. Check your connection and refresh.");
      } finally {
        setCatalogLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSearched(false);
      setResults([]);
      setError(null);
      setQuery("");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    setQuery(trimmed);

    try {
      const res = await fetch(`/api/steam/search?term=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.items ?? []);
    } catch {
      setError("Failed to search Steam. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback((term: string) => {
    if (!term.trim()) {
      setSearched(false);
      setResults([]);
      setError(null);
      setQuery("");
    }
  }, []);

  useEffect(() => {
    if (initialQuery) search(initialQuery);
  }, [initialQuery, search]);

  const showCatalog = !searched && !loading;

  return (
    <div className="space-y-8 overflow-x-hidden px-4 py-4 sm:px-0 sm:py-0 lg:space-y-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-normal text-steam-text-bright sm:text-3xl lg:text-4xl">
          Browse Steam
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-steam-muted sm:text-base lg:mt-3 lg:text-[15px]">
          Discover popular and upcoming story games — search as you type
        </p>

        <div className="mx-auto mt-6 w-full max-w-2xl lg:mt-8">
          <SearchAutocomplete
            defaultValue={initialQuery}
            onSubmit={search}
            onQueryChange={handleQueryChange}
            autoFocus={false}
            variant="hero"
            placeholder="Search for a game to add to your planner..."
          />
        </div>
      </div>

      {loading && (
        <div className="mx-auto max-w-3xl space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="row" />
          ))}
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-3xl rounded-[var(--radius-steamos-lg)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="mx-auto max-w-3xl py-12 text-center lg:py-16">
          <SearchIcon className="mx-auto h-8 w-8 text-steam-muted" />
          <p className="mt-3 text-sm text-steam-muted">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="steam-panel mx-auto max-w-3xl overflow-hidden rounded-[var(--radius-steamos-lg)]">
          <div className="steamos-section-header">
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </div>
          <div>
            {results.map((item, i) => (
              <GameCard
                key={item.id}
                appId={item.id}
                name={item.name}
                image={item.tiny_image}
                metascore={item.metascore || undefined}
                price={
                  item.price
                    ? formatPrice(item.price.final, item.price.currency)
                    : undefined
                }
                index={i}
                variant="list"
              />
            ))}
          </div>
        </div>
      )}

      {showCatalog && (
        <BrowseCatalog
          popular={popular}
          upcomingReleases={upcomingReleases}
          loading={catalogLoading}
          error={catalogError}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-4">
          <div className="mx-auto h-14 max-w-2xl skeleton rounded-[var(--radius-steamos-xl)]" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[16/10] skeleton rounded-sm" />
            ))}
          </div>
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
