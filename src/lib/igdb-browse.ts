import type { SteamFeaturedItem } from "@/lib/browse-types";
import {
  fetchIgdbGamesByIds,
  fetchIgdbPopularGameIds,
  getSteamAppIdFromIgdbGame,
  igdbImageUrl,
  isIgdbConfigured,
} from "@/lib/igdb";
import {
  fetchSteamAppMeta,
  isPlayableSteamStoreGame,
  isSingleplayerStoryGame,
  isSteamHardware,
  isUpcomingStoryGame,
  type SteamAppMeta,
} from "@/lib/steam-search-filters";

export const BROWSE_POPULAR_LIMIT = 12;

/** IGDB PopScore sources for Popular Now. */
const POPULARITY_SOURCES = [
  5, // Steam 24hr Peak Players
  9, // Steam Global Top Sellers
  1, // IGDB Visits
  2, // IGDB Want to Play
] as const;

/** IGDB PopScore sources for upcoming releases. */
const UPCOMING_SOURCES = [
  10, // Most Wishlisted Upcoming
  2, // IGDB Want to Play
] as const;

const PRIMITIVES_PER_SOURCE = 200;

interface IgdbBrowseCandidate {
  steamAppId: number;
  name: string;
  headerImage: string;
}

function toBrowseItem(candidate: IgdbBrowseCandidate, meta: SteamAppMeta): SteamFeaturedItem {
  const price = meta.price_overview;
  const finalPrice = meta.is_free ? 0 : (price?.final ?? 0);

  return {
    id: candidate.steamAppId,
    type: 0,
    name: meta.name ?? candidate.name,
    discounted: (price?.discount_percent ?? 0) > 0,
    discount_percent: price?.discount_percent ?? 0,
    original_price: price?.initial ?? 0,
    final_price: finalPrice,
    currency: price?.currency ?? "USD",
    header_image: candidate.headerImage,
    small_capsule_image: candidate.headerImage,
    windows_available: meta.platforms?.windows ?? true,
    mac_available: meta.platforms?.mac ?? false,
    linux_available: meta.platforms?.linux ?? false,
  };
}

async function candidatesForPopularityType(
  popularityType: number,
  seenSteamIds: Set<number>
): Promise<IgdbBrowseCandidate[]> {
  const orderedIgdbIds = await fetchIgdbPopularGameIds(popularityType, PRIMITIVES_PER_SOURCE);
  if (!orderedIgdbIds.length) return [];

  const games = await fetchIgdbGamesByIds(
    orderedIgdbIds,
    "name, cover.image_id, external_games.uid, external_games.category"
  );
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const candidates: IgdbBrowseCandidate[] = [];

  for (const igdbId of orderedIgdbIds) {
    const game = gamesById.get(igdbId);
    if (!game) continue;

    const steamAppId = getSteamAppIdFromIgdbGame(game);
    if (!steamAppId || seenSteamIds.has(steamAppId)) continue;
    if (isSteamHardware({ id: steamAppId, name: game.name })) continue;

    const imageId = game.cover?.image_id;
    if (!imageId) continue;

    candidates.push({
      steamAppId,
      name: game.name,
      headerImage: igdbImageUrl(imageId, "t_1080p"),
    });
  }

  return candidates;
}

async function buildIgdbBrowseList(
  popularityTypes: readonly number[],
  cc: string,
  limit: number,
  matchesTaste: (meta: SteamAppMeta) => boolean
): Promise<SteamFeaturedItem[]> {
  if (!isIgdbConfigured()) return [];

  const results: SteamFeaturedItem[] = [];
  const seenSteamIds = new Set<number>();

  for (const popularityType of popularityTypes) {
    if (results.length >= limit) break;

    const candidates = await candidatesForPopularityType(popularityType, seenSteamIds);
    if (!candidates.length) continue;

    const metas = await fetchSteamAppMeta(
      candidates.map((item) => item.steamAppId),
      cc
    );

    for (const candidate of candidates) {
      if (results.length >= limit) break;
      if (seenSteamIds.has(candidate.steamAppId)) continue;

      const meta = metas.get(candidate.steamAppId);
      if (!meta || !matchesTaste(meta)) continue;

      seenSteamIds.add(candidate.steamAppId);
      results.push(toBrowseItem(candidate, meta));
    }
  }

  return results;
}

export function buildIgdbPopularNow(
  cc = "US",
  limit = BROWSE_POPULAR_LIMIT
): Promise<SteamFeaturedItem[]> {
  return buildIgdbBrowseList(
    POPULARITY_SOURCES,
    cc,
    limit,
    (meta) => isPlayableSteamStoreGame(meta) && isSingleplayerStoryGame(meta)
  );
}

export function buildIgdbUpcomingReleases(
  cc = "US",
  limit = BROWSE_POPULAR_LIMIT
): Promise<SteamFeaturedItem[]> {
  return buildIgdbBrowseList(UPCOMING_SOURCES, cc, limit, isUpcomingStoryGame);
}
