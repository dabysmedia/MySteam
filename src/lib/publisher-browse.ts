import type { SteamFeaturedItem } from "@/lib/browse-types";
import { steamHeaderImageUrl } from "@/lib/steam-app-details";
import {
  getPublisherDatabase,
  matchNotableTitle,
  matchPublisherStudios,
  type PublisherEntry,
} from "@/lib/publisher-database";
import {
  fetchSteamAppMeta,
  isFutureStoreRelease,
  isSingleplayerStoryGame,
  isSteamHardware,
  isUpcomingStoryGame,
  type SteamAppMeta,
} from "@/lib/steam-search-filters";
import { fetchSteamStoreSearch } from "@/lib/steam-store-search";

const CACHE_MS = 30 * 60 * 1000;
const SEARCH_CONCURRENCY = 6;

interface CachedPublisherBrowse {
  popular: SteamFeaturedItem[];
  at: number;
}

let cachedBrowse: CachedPublisherBrowse | null = null;

const MAJOR_UPCOMING_TIERS = new Set(["platform_holder", "aaa", "aa"]);

function tierPriority(entry: PublisherEntry): number {
  if (entry.tier === "platform_holder") return 0;
  if (entry.tier === "aaa") return 1;
  if (entry.tier === "aa") return 2;
  return 3;
}

function collectNotableTitles(entries: PublisherEntry[], limit: number): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();

  const relevanceRank = (entry: PublisherEntry) =>
    entry.singleplayer_relevance === "high" ? 0 : entry.singleplayer_relevance === "medium" ? 1 : 2;

  const sorted = [...entries].sort((a, b) => relevanceRank(a) - relevanceRank(b));

  for (const entry of sorted) {
    if (entry.singleplayer_relevance === "low") continue;
    for (const title of entry.notable_singleplayer) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
      if (titles.length >= limit) return titles;
    }
  }

  return titles;
}

function collectMajorPublisherTitles(entries: PublisherEntry[], limit: number): string[] {
  const titles: string[] = [];
  const seen = new Set<string>();

  const major = entries
    .filter(
      (entry) =>
        MAJOR_UPCOMING_TIERS.has(entry.tier) && entry.singleplayer_relevance !== "low"
    )
    .sort((a, b) => tierPriority(a) - tierPriority(b));

  for (const entry of major) {
    for (const title of entry.notable_singleplayer) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
      if (titles.length >= limit) return titles;
    }
  }

  return titles;
}

function toFeaturedItem(id: number, name: string, meta: SteamAppMeta): SteamFeaturedItem | null {
  const headerImage = meta.header_image ?? steamHeaderImageUrl(id);
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
    header_image: headerImage,
    small_capsule_image: headerImage,
    windows_available: meta.platforms?.windows ?? true,
    mac_available: meta.platforms?.mac ?? false,
    linux_available: meta.platforms?.linux ?? false,
  };
}

async function resolveNotableTitle(
  title: string,
  cc: string,
  entries: PublisherEntry[]
): Promise<SteamFeaturedItem | null> {
  const results = await fetchSteamStoreSearch(title, cc);
  if (!results.length) return null;

  const candidate =
    results.find((item) => !isSteamHardware(item) && matchNotableTitle(entries, item.name)) ??
    results.find((item) => !isSteamHardware(item)) ??
    null;
  if (!candidate || isSteamHardware(candidate)) return null;

  const metas = await fetchSteamAppMeta([candidate.id], cc);
  const meta = metas.get(candidate.id);
  if (!meta || !isSingleplayerStoryGame(meta) || isFutureStoreRelease(meta)) return null;

  const matchesCatalog =
    matchPublisherStudios(entries, [...meta.developers, ...meta.publishers]).length > 0 ||
    Boolean(matchNotableTitle(entries, meta.name ?? candidate.name));
  if (!matchesCatalog) return null;

  return toFeaturedItem(candidate.id, candidate.name, meta);
}

async function resolveNotableUpcomingTitle(
  title: string,
  cc: string,
  entries: PublisherEntry[]
): Promise<SteamFeaturedItem | null> {
  const results = await fetchSteamStoreSearch(title, cc);
  if (!results.length) return null;

  const candidate =
    results.find((item) => !isSteamHardware(item) && matchNotableTitle(entries, item.name)) ??
    results.find((item) => !isSteamHardware(item)) ??
    null;
  if (!candidate || isSteamHardware(candidate)) return null;

  const metas = await fetchSteamAppMeta([candidate.id], cc);
  const meta = metas.get(candidate.id);
  if (
    !meta ||
    !isUpcomingStoryGame(meta, { trustUndatedRelease: true }) ||
    !isFutureStoreRelease(meta, { trustUndatedRelease: true })
  ) {
    return null;
  }

  const matchesCatalog =
    matchPublisherStudios(entries, [...meta.developers, ...meta.publishers]).length > 0 ||
    Boolean(matchNotableTitle(entries, meta.name ?? candidate.name));
  if (!matchesCatalog) return null;

  return toFeaturedItem(candidate.id, candidate.name, meta);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R | null>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      const result = await mapper(current);
      if (result) results.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

export async function buildPublisherPopularGames(
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const now = Date.now();
  if (cachedBrowse && now - cachedBrowse.at < CACHE_MS) {
    return cachedBrowse.popular.slice(0, limit);
  }

  const entries = await getPublisherDatabase();
  const titles = collectNotableTitles(entries, Math.max(limit * 3, 24));
  const resolved = await mapWithConcurrency(titles, SEARCH_CONCURRENCY, (title) =>
    resolveNotableTitle(title, cc, entries)
  );

  const seen = new Set<number>();
  const popular: SteamFeaturedItem[] = [];
  for (const game of resolved) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    popular.push(game);
    if (popular.length >= limit) break;
  }

  cachedBrowse = { popular, at: now };
  return popular.slice(0, limit);
}

export async function buildPublisherUpcomingGames(
  cc = "US",
  limit = 12
): Promise<SteamFeaturedItem[]> {
  const entries = await getPublisherDatabase();
  const titles = collectMajorPublisherTitles(entries, Math.max(limit * 4, 32));
  const resolved = await mapWithConcurrency(titles, SEARCH_CONCURRENCY, (title) =>
    resolveNotableUpcomingTitle(title, cc, entries)
  );

  const seen = new Set<number>();
  const upcoming: SteamFeaturedItem[] = [];
  for (const game of resolved) {
    if (seen.has(game.id)) continue;
    seen.add(game.id);
    upcoming.push(game);
    if (upcoming.length >= limit) break;
  }

  return upcoming.slice(0, limit);
}
