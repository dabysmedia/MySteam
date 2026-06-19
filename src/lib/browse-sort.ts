import type { SteamFeaturedItem } from "@/lib/browse-types";
import { compareBrowseGames, sortBrowseGames, type BrowseSortMode } from "@/lib/browse-rank";
import {
  getBestPublisherTierSortKey,
  getPublisherDatabase,
  scorePublisherDatabaseMatch,
  type PublisherEntry,
} from "@/lib/publisher-database";
import { fetchSteamAppMeta, getReleaseSortKeyFromMeta, type SteamAppMeta } from "@/lib/steam-search-filters";

function rankFeaturedBrowseGames(
  games: SteamFeaturedItem[],
  entries: PublisherEntry[],
  metas: Map<number, SteamAppMeta>,
  mode: BrowseSortMode
): SteamFeaturedItem[] {
  const ranked = games.map((game, index) => {
    const meta = metas.get(game.id);
    const catalogMeta = meta
      ? { ...meta, name: game.name }
      : { name: game.name, developers: [], publishers: [] };

    return {
      ...game,
      publisherTier: getBestPublisherTierSortKey(entries, catalogMeta),
      releaseSortKey: meta ? getReleaseSortKeyFromMeta(meta) : undefined,
      prestige: meta ? scorePublisherDatabaseMatch(entries, catalogMeta) : 0,
      index,
    };
  });

  ranked.sort((a, b) => {
    const byBrowse = compareBrowseGames(a, b, mode);
    if (byBrowse !== 0) return byBrowse;
    if (a.prestige !== b.prestige) return b.prestige - a.prestige;
    return a.index - b.index;
  });

  return ranked.map(({ prestige: _prestige, index: _index, ...game }) => game);
}

/** Sort browse tiles: publisher tier first, then release date. */
export async function sortFeaturedBrowseGames(
  games: SteamFeaturedItem[],
  cc = "US",
  mode: BrowseSortMode = "popular"
): Promise<SteamFeaturedItem[]> {
  if (games.length === 0) return games;

  const [entries, metas] = await Promise.all([
    getPublisherDatabase(),
    fetchSteamAppMeta(
      games.map((game) => game.id),
      cc
    ),
  ]);

  return rankFeaturedBrowseGames(games, entries, metas, mode);
}

/** @deprecated Use sortFeaturedBrowseGames */
export async function sortFeaturedGamesByPublisherTier(
  games: SteamFeaturedItem[],
  cc = "US"
): Promise<SteamFeaturedItem[]> {
  return sortFeaturedBrowseGames(games, cc, "popular");
}

export type { BrowseSortMode };
