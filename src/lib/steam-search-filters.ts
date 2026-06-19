import type { SteamFeaturedItem } from "@/lib/browse-types";
import { parseReleaseDate, releaseSortKey } from "@/lib/release-date";
import { extractSteamGenres, extractSteamTags } from "@/lib/steam-tags";
import { STEAM_FETCH_HEADERS } from "@/lib/steam-app-details";

/** Steam store items excluded from game browse/search results. */

const STEAM_HARDWARE_APP_IDS = new Set([
  1675200, // Steam Deck
  1696780, // Steam Deck Docking Station
  4165870, // Steam Controller
  353370, // Steam Controller (2015)
  4165910, // Steam Machine
  4165890, // Steam Frame
  1059550, // Valve Index Controllers
  1059530, // Valve Index Headset
  1059570, // Valve Index Base Station
  354231, // Valve Index VR Kit
  354233, // Valve Index Headset + Controllers
  1634050, // Valve Index Replacement Tether
  1072820, // Face Gasket for Valve Index
  1615180, // Valve Index Replacement Right Controller
  1615160, // Valve Index Replacement Left Controller
  2154720, // nofio wireless adapter for Valve Index
]);

const HARDWARE_NAME_PREFIXES = [
  "steam deck",
  "steam controller",
  "steam machine",
  "steam frame",
  "steam link",
] as const;

const EXCLUDED_APP_TYPES = new Set(["dlc", "music", "demo", "hardware", "video"]);

const STORY_GENRES = new Set(["Adventure", "RPG", "Casual", "Indie"]);
const NON_STORY_GENRES = new Set([
  "Racing",
  "Sports",
  "Free To Play",
  "Massively Multiplayer",
]);

import {
  getPublisherDatabase,
  matchesMajorPublisherCatalog,
  scorePublisherDatabaseMatch,
  type PublisherEntry,
} from "@/lib/publisher-database";

export interface SteamAppMeta {
  type?: string;
  name?: string;
  genres: string[];
  categories: string[];
  developers: string[];
  publishers: string[];
  recommendations?: number;
  metacritic?: number;
  header_image?: string;
  is_free?: boolean;
  price_overview?: {
    currency: string;
    initial: number;
    final: number;
    discount_percent: number;
  };
  platforms?: { windows: boolean; mac: boolean; linux: boolean };
  release_date?: { coming_soon: boolean; date: string };
}

export function getReleaseSortKeyFromMeta(meta: SteamAppMeta): number {
  const release = meta.release_date;
  if (!release?.date?.trim()) {
    return release?.coming_soon ? Infinity : 0;
  }
  if (isUndatedSteamRelease(release.date)) {
    return Infinity;
  }
  return releaseSortKey(release.date, release.coming_soon);
}

interface RankedStoreItem {
  id: number;
  name: string;
  rank: number;
  featuredSpecial: boolean;
  featuredNewRelease: boolean;
  featuredTopSeller: boolean;
}

export function isSteamHardware(item: { id: number; name: string }): boolean {
  if (STEAM_HARDWARE_APP_IDS.has(item.id)) return true;

  const name = item.name.toLowerCase();
  if (HARDWARE_NAME_PREFIXES.some((prefix) => name.startsWith(prefix))) return true;
  if (name.includes("valve index")) return true;

  return false;
}

function isFreeGame(meta: SteamAppMeta): boolean {
  if (meta.is_free) return true;
  if (meta.genres.includes("Free To Play")) return true;
  if (meta.price_overview?.final === 0) return true;
  return false;
}

function isPlayableGame(meta: SteamAppMeta): boolean {
  if (!meta.type) return !isFreeGame(meta);
  if (EXCLUDED_APP_TYPES.has(meta.type)) return false;
  if (meta.type !== "game") return false;
  if (isFreeGame(meta)) return false;
  return true;
}

export function isPlayableSteamStoreGame(meta: SteamAppMeta): boolean {
  return isPlayableGame(meta);
}

/** Matches the story-focused taste used to curate the planner queue. */
export function isSingleplayerStoryGame(meta: SteamAppMeta): boolean {
  if (!isPlayableGame(meta)) return false;

  const categories = new Set(meta.categories);
  if (!categories.has("Single-player")) return false;
  if (categories.has("MMO")) return false;
  if (categories.has("Online PvP") || categories.has("PvP")) return false;

  for (const genre of meta.genres) {
    if (NON_STORY_GENRES.has(genre)) return false;
  }

  return scoreSingleplayerStory(meta) >= 35;
}

function isUndatedSteamRelease(date: string | undefined): boolean {
  if (!date?.trim()) return true;
  const lower = date.trim().toLowerCase();
  return (
    lower.includes("coming soon") ||
    lower.includes("to be announced") ||
    lower === "tbd"
  );
}

function startOfTodayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isFutureSteamRelease(
  meta: SteamAppMeta,
  options?: { trustComingSoonFlag?: boolean }
): boolean {
  const release = meta.release_date;
  if (!release) return options?.trustComingSoonFlag ?? false;

  if (isUndatedSteamRelease(release.date)) {
    return release.coming_soon && (options?.trustComingSoonFlag ?? false);
  }

  const parsed = parseReleaseDate(release.date, false);
  if (!parsed) return false;

  if (parsed.sortKey !== Infinity && parsed.sortKey > 0) {
    const today = startOfTodayLocal();
    return parsed.sortKey > today.getTime();
  }

  return parsed.isFuture;
}

/** True when a Steam listing is still unreleased — uses Steam dates, with optional IGDB fallback. */
export function isFutureStoreRelease(
  meta: SteamAppMeta,
  options?: { igdbReleaseTimestamp?: number; trustUndatedRelease?: boolean }
): boolean {
  const release = meta.release_date;
  const hasConcreteSteamDate =
    Boolean(release?.date?.trim()) && !isUndatedSteamRelease(release?.date);

  if (hasConcreteSteamDate && release) {
    return isFutureSteamRelease(meta, {
      trustComingSoonFlag: options?.trustUndatedRelease,
    });
  }

  if (release?.coming_soon && isUndatedSteamRelease(release.date)) {
    if (options?.trustUndatedRelease) return true;
  }

  if (options?.igdbReleaseTimestamp) {
    return options.igdbReleaseTimestamp * 1000 > startOfTodayLocal().getTime();
  }

  return false;
}

/** Story taste for unreleased / preorder titles — allows games without a price yet. */
export function isUpcomingStoryGame(
  meta: SteamAppMeta,
  options?: { trustUndatedRelease?: boolean; igdbReleaseTimestamp?: number }
): boolean {
  if (meta.type && EXCLUDED_APP_TYPES.has(meta.type)) return false;
  if (meta.type && meta.type !== "game") return false;

  const categories = new Set(meta.categories);
  if (!categories.has("Single-player")) return false;
  if (categories.has("MMO")) return false;
  if (categories.has("Online PvP") || categories.has("PvP")) return false;

  for (const genre of meta.genres) {
    if (NON_STORY_GENRES.has(genre)) return false;
  }

  return (
    scoreSingleplayerStory(meta) >= 35 &&
    isFutureStoreRelease(meta, {
      igdbReleaseTimestamp: options?.igdbReleaseTimestamp,
      trustUndatedRelease: options?.trustUndatedRelease,
    })
  );
}

export function scoreSingleplayerStory(meta: SteamAppMeta): number {
  const categories = new Set(meta.categories);
  const genres = new Set(meta.genres);
  let score = 0;

  if (categories.has("Single-player")) score += 50;
  if (!categories.has("Multi-player")) score += 15;

  if (categories.has("Multi-player")) score -= 28;
  if (categories.has("Online PvP") || categories.has("PvP")) score -= 22;
  if (categories.has("Co-op") || categories.has("Online Co-op")) score -= 12;
  if (categories.has("MMO")) score -= 40;
  if (categories.has("Cross-Platform Multiplayer")) score -= 10;

  for (const genre of genres) {
    if (STORY_GENRES.has(genre)) score += 18;
    if (NON_STORY_GENRES.has(genre)) score -= 28;
  }

  return score;
}

export function scoreAaaAndPopularity(
  meta: SteamAppMeta,
  item: Pick<RankedStoreItem, "rank" | "featuredSpecial" | "featuredNewRelease" | "featuredTopSeller">,
  publisherEntries: PublisherEntry[] = []
): number {
  let score = 0;

  if (publisherEntries.length > 0) {
    score += scorePublisherDatabaseMatch(publisherEntries, meta);
  }

  const recs = meta.recommendations ?? 0;
  if (recs >= 500_000) score += 42;
  else if (recs >= 100_000) score += 30;
  else if (recs >= 25_000) score += 18;
  else if (recs >= 5_000) score += 8;

  const mc = meta.metacritic;
  if (mc != null) {
    if (mc >= 90) score += 28;
    else if (mc >= 80) score += 20;
    else if (mc >= 70) score += 10;
  }

  if (item.rank < Infinity) {
    score += Math.max(0, 26 - Math.floor(item.rank / 2));
  }

  // Steam store featuring — closest proxy for SGF / event spotlights
  if (item.featuredSpecial) score += 22;
  if (item.featuredNewRelease) score += 16;
  if (item.featuredTopSeller) score += 12;

  const price = meta.price_overview?.final ?? 0;
  if (price >= 4999) score += 10;
  else if (price >= 2999) score += 5;

  return score;
}

const META_CACHE_MS = 60 * 60 * 1000;
const META_FETCH_CONCURRENCY = 6;

const metaCache = new Map<string, { meta: SteamAppMeta; at: number }>();
const metaInflight = new Map<string, Promise<SteamAppMeta | null>>();
let activeMetaFetches = 0;
const metaFetchWaiters: Array<() => void> = [];

async function acquireMetaFetchSlot(): Promise<void> {
  if (activeMetaFetches < META_FETCH_CONCURRENCY) {
    activeMetaFetches++;
    return;
  }

  await new Promise<void>((resolve) => {
    metaFetchWaiters.push(resolve);
  });
  activeMetaFetches++;
}

function releaseMetaFetchSlot(): void {
  activeMetaFetches--;
  const next = metaFetchWaiters.shift();
  if (next) next();
}

async function loadSteamAppMeta(id: number, cc: string): Promise<SteamAppMeta | null> {
  const key = `${id}:${cc}`;
  const cached = metaCache.get(key);
  if (cached && Date.now() - cached.at < META_CACHE_MS) {
    return cached.meta;
  }

  const pending = metaInflight.get(key);
  if (pending) return pending;

  const promise = (async (): Promise<SteamAppMeta | null> => {
    await acquireMetaFetchSlot();
    try {
      const url = new URL("https://store.steampowered.com/api/appdetails");
      url.searchParams.set("appids", String(id));
      url.searchParams.set("cc", cc);
      url.searchParams.set("l", "english");

      const res = await fetch(url.toString(), {
        headers: STEAM_FETCH_HEADERS,
        next: { revalidate: 3600 },
      });

      if (!res.ok) return null;

      const data = (await res.json()) as Record<
        string,
        {
          success?: boolean;
          data?: {
            type?: string;
            name?: string;
            genres?: { description: string }[];
            categories?: { description: string }[];
            developers?: string[];
            publishers?: string[];
            recommendations?: { total: number };
            metacritic?: { score: number };
            header_image?: string;
            is_free?: boolean;
            price_overview?: SteamAppMeta["price_overview"];
            platforms?: SteamAppMeta["platforms"];
            release_date?: { coming_soon: boolean; date: string };
          };
        }
      >;
      const entry = data[String(id)];
      if (!entry?.success || !entry.data) return null;

      const details = entry.data;
      const meta: SteamAppMeta = {
        type: details.type,
        name: details.name,
        genres: extractSteamGenres(details.genres),
        categories: extractSteamTags(details.categories),
        developers: details.developers ?? [],
        publishers: details.publishers ?? [],
        recommendations: details.recommendations?.total,
        metacritic: details.metacritic?.score,
        header_image: details.header_image,
        is_free: details.is_free,
        price_overview: details.price_overview,
        platforms: details.platforms,
        release_date: details.release_date,
      };

      metaCache.set(key, { meta, at: Date.now() });
      return meta;
    } catch {
      return null;
    } finally {
      releaseMetaFetchSlot();
      metaInflight.delete(key);
    }
  })();

  metaInflight.set(key, promise);
  return promise;
}

export async function fetchSteamAppMeta(
  appIds: number[],
  cc: string
): Promise<Map<number, SteamAppMeta>> {
  const metas = new Map<number, SteamAppMeta>();
  const uniqueIds = [...new Set(appIds)];
  if (uniqueIds.length === 0) return metas;

  let index = 0;

  async function worker() {
    while (index < uniqueIds.length) {
      const id = uniqueIds[index++];
      const meta = await loadSteamAppMeta(id, cc);
      if (meta) metas.set(id, meta);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(META_FETCH_CONCURRENCY, uniqueIds.length) }, () => worker())
  );

  return metas;
}

function parseAppIdFromLogo(logo: string): number | null {
  const match = logo.match(/\/apps\/(\d+)\//);
  return match ? Number(match[1]) : null;
}

async function fetchGlobalTopSellers(cc: string, count = 50): Promise<RankedStoreItem[]> {
  const url = new URL("https://store.steampowered.com/search/results/");
  url.searchParams.set("filter", "globaltopsellers");
  url.searchParams.set("category1", "998");
  url.searchParams.set("json", "1");
  url.searchParams.set("cc", cc);
  url.searchParams.set("l", "english");
  url.searchParams.set("count", String(count));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "MySteam/1.0",
    },
    next: { revalidate: 1800 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { items?: { name?: string; logo?: string }[] };
  const items: RankedStoreItem[] = [];

  for (const [rank, item] of (data.items ?? []).entries()) {
    const id = item.logo ? parseAppIdFromLogo(item.logo) : null;
    if (!id || !item.name) continue;
    items.push({
      id,
      name: item.name,
      rank,
      featuredSpecial: false,
      featuredNewRelease: false,
      featuredTopSeller: false,
    });
  }

  return items;
}

async function fetchSteamComingSoon(cc: string, count = 100): Promise<RankedStoreItem[]> {
  const url = new URL("https://store.steampowered.com/search/results/");
  url.searchParams.set("filter", "comingsoon");
  url.searchParams.set("category1", "998");
  url.searchParams.set("json", "1");
  url.searchParams.set("cc", cc);
  url.searchParams.set("l", "english");
  url.searchParams.set("count", String(count));

  const res = await fetch(url.toString(), {
    headers: STEAM_FETCH_HEADERS,
    next: { revalidate: 1800 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { items?: { name?: string; logo?: string }[] };
  const items: RankedStoreItem[] = [];

  for (const [rank, item] of (data.items ?? []).entries()) {
    const id = item.logo ? parseAppIdFromLogo(item.logo) : null;
    if (!id || !item.name) continue;
    items.push({
      id,
      name: item.name,
      rank,
      featuredSpecial: false,
      featuredNewRelease: false,
      featuredTopSeller: false,
    });
  }

  return items;
}

function passesUpcomingBrowseFilter(
  meta: SteamAppMeta,
  publisherEntries: PublisherEntry[],
  options?: { trustUndatedRelease?: boolean; igdbReleaseTimestamp?: number }
): boolean {
  return (
    isUpcomingStoryGame(meta, options) &&
    matchesMajorPublisherCatalog(publisherEntries, meta)
  );
}

interface FeaturedCategoryBuckets {
  specials: Set<number>;
  newReleases: Set<number>;
  topSellers: Set<number>;
}

interface FeaturedCategoryData {
  buckets: FeaturedCategoryBuckets;
  names: Map<number, string>;
}

async function fetchFeaturedCategoryData(cc: string): Promise<FeaturedCategoryData> {
  const buckets: FeaturedCategoryBuckets = {
    specials: new Set(),
    newReleases: new Set(),
    topSellers: new Set(),
  };
  const names = new Map<number, string>();

  try {
    const url = new URL("https://store.steampowered.com/api/featuredcategories/");
    url.searchParams.set("cc", cc);
    url.searchParams.set("l", "english");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "User-Agent": "MySteam/1.0",
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) return { buckets, names };

    const data = (await res.json()) as Record<
      string,
      { items?: { id?: number; name?: string; type?: number }[] }
    >;

    for (const item of data.specials?.items ?? []) {
      if (item.id && item.type === 0) {
        buckets.specials.add(item.id);
        if (item.name) names.set(item.id, item.name);
      }
    }
    for (const item of data.new_releases?.items ?? []) {
      if (item.id && item.type === 0) {
        buckets.newReleases.add(item.id);
        if (item.name) names.set(item.id, item.name);
      }
    }
    for (const item of data.top_sellers?.items ?? []) {
      if (item.id && item.type === 0) {
        buckets.topSellers.add(item.id);
        if (item.name) names.set(item.id, item.name);
      }
    }
  } catch {
    // Fall back to top-seller list only.
  }

  return { buckets, names };
}

function mergePopularCandidates(
  topSellers: RankedStoreItem[],
  buckets: FeaturedCategoryBuckets,
  names: Map<number, string>
): RankedStoreItem[] {
  const merged = new Map<number, RankedStoreItem>();

  function upsert(id: number, name: string, patch: Partial<RankedStoreItem>) {
    const existing = merged.get(id) ?? {
      id,
      name,
      rank: Infinity,
      featuredSpecial: false,
      featuredNewRelease: false,
      featuredTopSeller: false,
    };
    merged.set(id, {
      ...existing,
      name: existing.name || name,
      rank: Math.min(existing.rank, patch.rank ?? Infinity),
      featuredSpecial: existing.featuredSpecial || patch.featuredSpecial || false,
      featuredNewRelease: existing.featuredNewRelease || patch.featuredNewRelease || false,
      featuredTopSeller: existing.featuredTopSeller || patch.featuredTopSeller || false,
    });
  }

  for (const item of topSellers) {
    upsert(item.id, item.name, {
      rank: item.rank,
      featuredTopSeller: buckets.topSellers.has(item.id),
      featuredSpecial: buckets.specials.has(item.id),
      featuredNewRelease: buckets.newReleases.has(item.id),
    });
  }

  for (const id of buckets.specials) {
    upsert(id, names.get(id) ?? "", { featuredSpecial: true });
  }
  for (const id of buckets.newReleases) {
    upsert(id, names.get(id) ?? "", { featuredNewRelease: true });
  }
  for (const id of buckets.topSellers) {
    upsert(id, names.get(id) ?? "", { featuredTopSeller: true });
  }

  return [...merged.values()];
}

function toFeaturedItem(id: number, name: string, meta: SteamAppMeta): SteamFeaturedItem | null {
  if (!meta.header_image) return null;

  const price = meta.price_overview;
  const finalPrice = meta.is_free ? 0 : (price?.final ?? 0);

  return {
    id,
    type: 0,
    name: meta.name ?? name,
    discounted: (price?.discount_percent ?? 0) > 0,
    discount_percent: price?.discount_percent ?? 0,
    original_price: price?.initial ?? 0,
    final_price: finalPrice,
    currency: price?.currency ?? "USD",
    header_image: meta.header_image,
    small_capsule_image: meta.header_image,
    windows_available: meta.platforms?.windows ?? true,
    mac_available: meta.platforms?.mac ?? false,
    linux_available: meta.platforms?.linux ?? false,
  };
}

export async function filterSteamSearchResults<T extends { id: number; name: string }>(
  items: T[],
  cc = "US"
): Promise<T[]> {
  const withoutHardware = items.filter((item) => !isSteamHardware(item));
  if (withoutHardware.length === 0) return [];

  const metas = await fetchSteamAppMeta(
    withoutHardware.map((item) => item.id),
    cc
  );

  const filtered = withoutHardware.filter((item) => {
    const meta = metas.get(item.id);
    if (!meta) return true;
    return isSingleplayerStoryGame(meta);
  });

  // If Steam metadata was slow/unavailable for most hits, don't return an empty search.
  if (filtered.length === 0 && withoutHardware.length > 0) {
    return withoutHardware;
  }

  return filtered;
}

export function pickFeaturedStoreGames(
  items: SteamFeaturedItem[] | undefined,
  limit = 12
): SteamFeaturedItem[] {
  const seen = new Set<number>();
  const picked: SteamFeaturedItem[] = [];

  for (const item of items ?? []) {
    if (item.type !== 0 || seen.has(item.id)) continue;
    if (isSteamHardware({ id: item.id, name: item.name })) continue;
    seen.add(item.id);
    picked.push(item);
    if (picked.length >= limit) break;
  }

  return picked;
}

async function filterFeaturedBrowseSection(
  items: SteamFeaturedItem[],
  cc: string,
  limit: number,
  matchesTaste: (meta: SteamAppMeta, publisherEntries: PublisherEntry[]) => boolean,
  options?: { includeRelaxed?: boolean }
): Promise<SteamFeaturedItem[]> {
  if (!items.length) return [];

  const sample = items.slice(0, Math.min(items.length, limit * 2));
  const [metas, publisherEntries] = await Promise.all([
    fetchSteamAppMeta(
      sample.map((item) => item.id),
      cc
    ),
    getPublisherDatabase(),
  ]);

  const strict: SteamFeaturedItem[] = [];
  const relaxed: SteamFeaturedItem[] = [];

  for (const item of sample) {
    const meta = metas.get(item.id);
    if (!meta) continue;
    if (matchesTaste(meta, publisherEntries)) {
      strict.push(item);
      continue;
    }
    if (options?.includeRelaxed && isSingleplayerStoryGame(meta)) {
      relaxed.push(item);
    }
  }

  const merged = mergeBrowseItems(strict, relaxed, limit);
  return merged.slice(0, limit);
}

function mergeBrowseItems(
  primary: SteamFeaturedItem[],
  secondary: SteamFeaturedItem[],
  limit: number
): SteamFeaturedItem[] {
  const merged = [...primary];
  const seen = new Set(merged.map((game) => game.id));

  for (const game of secondary) {
    if (seen.has(game.id)) continue;
    merged.push(game);
    seen.add(game.id);
    if (merged.length >= limit) break;
  }

  return merged;
}

export async function buildFeaturedPopularBrowse(
  items: SteamFeaturedItem[],
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const candidates = pickFeaturedStoreGames(items, limit * 2);
  return filterFeaturedBrowseSection(
    candidates,
    cc,
    limit,
    (meta, publisherEntries) =>
      isSingleplayerStoryGame(meta) &&
      !isFutureStoreRelease(meta) &&
      matchesMajorPublisherCatalog(publisherEntries, meta)
  );
}

export async function buildFeaturedUpcomingBrowse(
  items: SteamFeaturedItem[],
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const candidates = pickFeaturedStoreGames(items, limit * 2);
  return filterFeaturedBrowseSection(
    candidates,
    cc,
    limit,
    (meta, publisherEntries) =>
      isUpcomingStoryGame(meta, { trustUndatedRelease: true }) &&
      matchesMajorPublisherCatalog(publisherEntries, meta)
  );
}

export async function filterFeaturedGames(
  items: SteamFeaturedItem[],
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const seen = new Set<number>();
  const unique = items.filter((item) => {
    if (item.type !== 0 || seen.has(item.id) || item.final_price === 0) return false;
    seen.add(item.id);
    return true;
  });

  const filtered = await filterSteamSearchResults(unique, cc);
  const allowed = new Set(filtered.map((item) => item.id));
  return unique.filter((item) => allowed.has(item.id)).slice(0, limit);
}

export async function filterUpcomingGames(
  items: SteamFeaturedItem[],
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const seen = new Set<number>();
  const unique = items.filter((item) => {
    if (item.type !== 0 || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  if (!unique.length) return [];

  const [metas, publisherEntries] = await Promise.all([
    fetchSteamAppMeta(
      unique.map((item) => item.id),
      cc
    ),
    getPublisherDatabase(),
  ]);

  return unique
    .filter((item) => {
      const meta = metas.get(item.id);
      return (
        meta &&
        passesUpcomingBrowseFilter(meta, publisherEntries, {
          trustUndatedRelease: true,
        })
      );
    })
    .slice(0, limit);
}

export async function buildCuratedUpcomingGames(
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const [candidates, publisherEntries] = await Promise.all([
    fetchSteamComingSoon(cc, 50),
    getPublisherDatabase(),
  ]);

  const withoutHardware = candidates.filter((item) => !isSteamHardware(item));
  if (!withoutHardware.length) return [];

  const metas = await fetchSteamAppMeta(
    withoutHardware.map((item) => item.id),
    cc
  );

  const ranked = withoutHardware
    .map((item) => {
      const meta = metas.get(item.id);
      if (
        !meta ||
        !passesUpcomingBrowseFilter(meta, publisherEntries, {
          trustUndatedRelease: true,
        })
      ) {
        return null;
      }

      const score =
        scoreSingleplayerStory(meta) +
        scoreAaaAndPopularity(meta, item, publisherEntries);
      return { item, meta, score };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score || a.item.rank - b.item.rank)
    .slice(0, limit);

  return ranked
    .map(({ item, meta }) => toFeaturedItem(item.id, item.name, meta))
    .filter((item): item is SteamFeaturedItem => item !== null);
}

export async function buildCuratedPopularGames(
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const [topSellers, featured, publisherEntries] = await Promise.all([
    fetchGlobalTopSellers(cc, 50),
    fetchFeaturedCategoryData(cc),
    getPublisherDatabase(),
  ]);

  const candidates = mergePopularCandidates(topSellers, featured.buckets, featured.names).filter(
    (item) => !isSteamHardware(item)
  );
  if (candidates.length === 0) return [];

  const metas = await fetchSteamAppMeta(
    candidates.map((item) => item.id),
    cc
  );

  const ranked = candidates
    .map((item) => {
      const meta = metas.get(item.id);
      if (
        !meta ||
        !isSingleplayerStoryGame(meta) ||
        isFutureStoreRelease(meta) ||
        !matchesMajorPublisherCatalog(publisherEntries, meta)
      ) {
        return null;
      }

      const score =
        scoreSingleplayerStory(meta) +
        scoreAaaAndPopularity(meta, item, publisherEntries);
      return {
        item,
        meta,
        score,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.score - a.score || a.item.rank - b.item.rank)
    .slice(0, limit);

  return ranked
    .map(({ item, meta }) => toFeaturedItem(item.id, item.name || meta.name || "", meta))
    .filter((item): item is SteamFeaturedItem => item !== null);
}
