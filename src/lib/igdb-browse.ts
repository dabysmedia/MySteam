import type { SteamFeaturedItem } from "@/lib/browse-types";
import {
  fetchIgdbGamesByIds,
  fetchIgdbPopularGameIds,
  getSteamAppIdFromIgdbGame,
  igdbImageUrl,
  isIgdbConfigured,
} from "@/lib/igdb";
import {
  getPublisherDatabase,
  matchesMajorPublisherCatalog,
  type PublisherEntry,
} from "@/lib/publisher-database";
import {
  fetchSteamAppMeta,
  isFutureStoreRelease,
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
] as const;

const PRIMITIVES_PER_SOURCE = 200;
const UPCOMING_PRIMITIVES_PER_SOURCE = 400;

interface IgdbBrowseCandidate {
  steamAppId: number;
  name: string;
  headerImage: string;
  igdbReleaseDate?: number;
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
    header_image: meta.header_image ?? candidate.headerImage,
    small_capsule_image: meta.header_image ?? candidate.headerImage,
    windows_available: meta.platforms?.windows ?? true,
    mac_available: meta.platforms?.mac ?? false,
    linux_available: meta.platforms?.linux ?? false,
  };
}

async function candidatesForPopularityType(
  popularityType: number,
  seenSteamIds: Set<number>,
  upcomingOnly = false
): Promise<IgdbBrowseCandidate[]> {
  const primitiveLimit = upcomingOnly ? UPCOMING_PRIMITIVES_PER_SOURCE : PRIMITIVES_PER_SOURCE;
  const orderedIgdbIds = await fetchIgdbPopularGameIds(popularityType, primitiveLimit);
  if (!orderedIgdbIds.length) return [];

  const fields = upcomingOnly
    ? "name, cover.image_id, first_release_date, external_games.uid, external_games.external_game_source"
    : "name, cover.image_id, external_games.uid, external_games.external_game_source";

  const games = await fetchIgdbGamesByIds(orderedIgdbIds, fields);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const candidates: IgdbBrowseCandidate[] = [];
  const nowSec = Math.floor(Date.now() / 1000);

  for (const igdbId of orderedIgdbIds) {
    const game = gamesById.get(igdbId);
    if (!game) continue;

    if (upcomingOnly && game.first_release_date && game.first_release_date <= nowSec) {
      continue;
    }

    const steamAppId = getSteamAppIdFromIgdbGame(game);
    if (!steamAppId || seenSteamIds.has(steamAppId)) continue;
    if (isSteamHardware({ id: steamAppId, name: game.name })) continue;

    const imageId = game.cover?.image_id;
    if (!imageId) continue;

    candidates.push({
      steamAppId,
      name: game.name,
      headerImage: igdbImageUrl(imageId, "t_1080p"),
      igdbReleaseDate: game.first_release_date,
    });
  }

  return candidates;
}

async function buildIgdbBrowseList(
  popularityTypes: readonly number[],
  cc: string,
  limit: number,
  matchesTaste: (
    meta: SteamAppMeta,
    publisherEntries: PublisherEntry[],
    candidate: IgdbBrowseCandidate
  ) => boolean,
  upcomingOnly = false
): Promise<SteamFeaturedItem[]> {
  if (!isIgdbConfigured()) return [];

  const publisherEntries = await getPublisherDatabase();
  const results: SteamFeaturedItem[] = [];
  const seenSteamIds = new Set<number>();

  for (const popularityType of popularityTypes) {
    if (results.length >= limit) break;

    const candidates = await candidatesForPopularityType(
      popularityType,
      seenSteamIds,
      upcomingOnly
    );
    if (!candidates.length) continue;

    const metas = await fetchSteamAppMeta(
      candidates.map((item) => item.steamAppId),
      cc
    );

    for (const candidate of candidates) {
      if (results.length >= limit) break;
      if (seenSteamIds.has(candidate.steamAppId)) continue;

      const meta = metas.get(candidate.steamAppId);
      if (!meta || !matchesTaste(meta, publisherEntries, candidate)) continue;

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
    (meta, publisherEntries, _candidate) =>
      isPlayableSteamStoreGame(meta) &&
      isSingleplayerStoryGame(meta) &&
      !isFutureStoreRelease(meta) &&
      matchesMajorPublisherCatalog(publisherEntries, meta)
  );
}

export function buildIgdbUpcomingReleases(
  cc = "US",
  limit = BROWSE_POPULAR_LIMIT
): Promise<SteamFeaturedItem[]> {
  return buildIgdbBrowseList(
    UPCOMING_SOURCES,
    cc,
    limit,
    (meta, publisherEntries, candidate) =>
      isUpcomingStoryGame(meta, {
        trustUndatedRelease: true,
        igdbReleaseTimestamp: candidate.igdbReleaseDate,
      }) && matchesMajorPublisherCatalog(publisherEntries, meta),
    true
  );
}
