import type { SteamFeaturedItem } from "@/lib/browse-types";

export type BrowseSortMode = "popular" | "upcoming";

export function compareBrowseGames(
  a: SteamFeaturedItem,
  b: SteamFeaturedItem,
  mode: BrowseSortMode
): number {
  const tierA = a.publisherTier ?? 99;
  const tierB = b.publisherTier ?? 99;
  if (tierA !== tierB) return tierA - tierB;

  const dateA = a.releaseSortKey ?? (mode === "upcoming" ? Infinity : 0);
  const dateB = b.releaseSortKey ?? (mode === "upcoming" ? Infinity : 0);
  if (dateA !== dateB) {
    return mode === "upcoming" ? dateA - dateB : dateB - dateA;
  }

  return a.name.localeCompare(b.name);
}

export function sortBrowseGames(
  games: SteamFeaturedItem[],
  mode: BrowseSortMode
): SteamFeaturedItem[] {
  return [...games].sort((a, b) => compareBrowseGames(a, b, mode));
}
