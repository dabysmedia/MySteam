import type { SteamFeaturedItem } from "@/lib/browse-types";
import { sortBrowseGames, type BrowseSortMode } from "@/lib/browse-rank";

export const BROWSE_DISPLAY_LIMIT = 12;
export const BROWSE_MAJOR_TIER_MAX = 2;

export type { BrowseSortMode };

/** Re-apply browse order after client-side filtering (tier, then release date). */
export function sortByStoredBrowseRank(
  games: SteamFeaturedItem[],
  mode: BrowseSortMode
): SteamFeaturedItem[] {
  return sortBrowseGames(games, mode);
}

/** @deprecated Use sortByStoredBrowseRank */
export function sortByStoredPublisherTier(games: SteamFeaturedItem[]): SteamFeaturedItem[] {
  return sortByStoredBrowseRank(games, "popular");
}

/** Pick games to show, preferring major publishers; backfills from reserve when items are hidden. */
export function selectBrowseGames(
  games: SteamFeaturedItem[],
  excludeIds: Set<number>,
  mode: BrowseSortMode,
  limit = BROWSE_DISPLAY_LIMIT
): SteamFeaturedItem[] {
  const filtered = sortByStoredBrowseRank(
    games.filter((game) => !excludeIds.has(game.id)),
    mode
  );

  const major = filtered.filter((game) => (game.publisherTier ?? 99) <= BROWSE_MAJOR_TIER_MAX);
  if (major.length >= limit) return major.slice(0, limit);

  return filtered.slice(0, limit);
}
