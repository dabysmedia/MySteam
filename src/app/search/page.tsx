"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { BrowseCatalog } from "@/components/BrowseCatalog";
import { GameCard } from "@/components/GameCard";
import { SkeletonCard } from "@/components/Skeleton";
import type { SteamSearchItem } from "@/lib/types";
import type { SteamBrowseResponse } from "@/lib/browse-types";
import { formatPrice } from "@/lib/utils";

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

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/steam/browse");
        if (!res.ok) throw new Error("browse failed");
        setCatalog(await res.json());
      } catch {
        setCatalog({ popular: [], newReleases: [], comingSoon: [] });
      } finally {
        setCatalogLoading(false);
      }
    }
    loadCatalog();
  }, []);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setQuery(term);

    try {
      const res = await fetch(`/api/steam/search?term=${encodeURIComponent(term)}`);
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

  useEffect(() => {
    if (initialQuery) search(initialQuery);
  }, [initialQuery, search]);

  const showCatalog = !searched && !loading;

  return (
    <div className="space-y-5 overflow-x-hidden px-4 py-4 sm:px-0 sm:py-0 lg:space-y-8">
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div>
          <h1 className="text-xl font-normal text-steam-text-bright sm:text-2xl lg:text-3xl">
            Browse Steam
          </h1>
          <p className="mt-1 text-sm text-steam-muted lg:mt-2 lg:text-[15px]">
            Discover popular and new games — search as you type
          </p>
        </div>
        <p className="hidden text-sm text-steam-muted lg:block lg:max-w-xs lg:text-right">
          Pick a game to view details and add it to your planner.
        </p>
      </div>

      <div className="lg:max-w-2xl">
        <SearchAutocomplete
          defaultValue={initialQuery}
          onSubmit={search}
          autoFocus={false}
          placeholder="Search the Steam store..."
        />
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} variant="row" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="py-16 text-center">
          <SearchIcon className="mx-auto h-8 w-8 text-steam-muted" />
          <p className="mt-3 text-sm text-steam-muted">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="steam-panel overflow-hidden rounded-sm">
          <div className="steam-section-header">
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
          popular={catalog?.popular ?? []}
          newReleases={catalog?.newReleases ?? []}
          comingSoon={catalog?.comingSoon ?? []}
          loading={catalogLoading}
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
          <div className="h-10 skeleton rounded-sm" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[460/215] skeleton rounded-sm" />
            ))}
          </div>
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
