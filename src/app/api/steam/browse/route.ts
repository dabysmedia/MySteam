import { NextRequest, NextResponse } from "next/server";
import type { SteamBrowseResponse, SteamFeaturedItem } from "@/lib/browse-types";
import {
  buildIgdbPopularNow,
  buildIgdbUpcomingReleases,
  BROWSE_POPULAR_LIMIT,
} from "@/lib/igdb-browse";
import { isIgdbConfigured } from "@/lib/igdb";
import { BROWSE_MAJOR_TIER_MAX } from "@/lib/publisher-database";
import {
  buildCuratedPopularGames,
  buildCuratedUpcomingGames,
  buildFeaturedPopularBrowse,
  buildFeaturedUpcomingBrowse,
  pickFeaturedStoreGames,
} from "@/lib/steam-search-filters";
import { sortFeaturedBrowseGames } from "@/lib/browse-sort";

interface CategoryBlock {
  name?: string;
  items?: SteamFeaturedItem[];
}

interface FeaturedCategoriesResponse {
  top_sellers?: CategoryBlock;
  new_releases?: CategoryBlock;
  coming_soon?: CategoryBlock;
}

const BROWSE_SORT_POOL_LIMIT = 48;
const BROWSE_CACHE_MS = 30 * 60 * 1000;
const MIN_CACHED_POPULAR = 6;
const MIN_CACHED_UPCOMING = 4;

const browseCache = new Map<string, { data: SteamBrowseResponse; at: number }>();

function mergeBrowseSection(
  primary: SteamFeaturedItem[],
  secondary: SteamFeaturedItem[],
  limit = BROWSE_SORT_POOL_LIMIT
): SteamFeaturedItem[] {
  const merged = [...primary];
  if (merged.length >= limit) return merged.slice(0, limit);

  const seen = new Set(merged.map((game) => game.id));
  for (const game of secondary) {
    if (seen.has(game.id)) continue;
    merged.push(game);
    seen.add(game.id);
    if (merged.length >= limit) break;
  }

  return merged.length > 0 ? merged : secondary.slice(0, limit);
}

function featuredPopularCandidates(data: FeaturedCategoriesResponse): SteamFeaturedItem[] {
  return mergeBrowseSection(
    pickFeaturedStoreGames(data.top_sellers?.items, BROWSE_SORT_POOL_LIMIT),
    pickFeaturedStoreGames(data.new_releases?.items, BROWSE_SORT_POOL_LIMIT),
    BROWSE_SORT_POOL_LIMIT
  );
}

/** Keep AA-and-above when possible; lower tiers only pad reserves when major titles run short. */
function finalizeBrowsePool(games: SteamFeaturedItem[]): SteamFeaturedItem[] {
  const major = games.filter((game) => (game.publisherTier ?? 99) <= BROWSE_MAJOR_TIER_MAX);
  if (major.length >= BROWSE_POPULAR_LIMIT) {
    return major.slice(0, BROWSE_SORT_POOL_LIMIT);
  }
  return games.slice(0, BROWSE_SORT_POOL_LIMIT);
}

export async function GET(request: NextRequest) {
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

  const cached = browseCache.get(cc);
  if (cached && Date.now() - cached.at < BROWSE_CACHE_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const featuredUrl = new URL("https://store.steampowered.com/api/featuredcategories/");
    featuredUrl.searchParams.set("cc", cc);
    featuredUrl.searchParams.set("l", "english");

    const [featuredRes, curatedPopular, curatedUpcoming] = await Promise.all([
      fetch(featuredUrl.toString(), {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "User-Agent": "MySteam/1.0",
        },
        next: { revalidate: 1800 },
      }),
      buildCuratedPopularGames(cc, BROWSE_SORT_POOL_LIMIT),
      buildCuratedUpcomingGames(cc, BROWSE_SORT_POOL_LIMIT),
    ]);

    if (!featuredRes.ok) {
      return NextResponse.json({ error: "Failed to fetch browse data" }, { status: featuredRes.status });
    }

    const data = (await featuredRes.json()) as FeaturedCategoriesResponse;
    const popularCandidates = featuredPopularCandidates(data);
    const upcomingCandidates = pickFeaturedStoreGames(
      data.coming_soon?.items,
      BROWSE_SORT_POOL_LIMIT
    );

    const [featuredPopular, featuredUpcoming] = await Promise.all([
      buildFeaturedPopularBrowse(popularCandidates, cc, BROWSE_SORT_POOL_LIMIT),
      buildFeaturedUpcomingBrowse(upcomingCandidates, cc, BROWSE_SORT_POOL_LIMIT),
    ]);

    let popularFromIgdb: SteamFeaturedItem[] = [];
    let upcomingFromIgdb: SteamFeaturedItem[] = [];
    const popularSeedCount = mergeBrowseSection(curatedPopular, featuredPopular, BROWSE_SORT_POOL_LIMIT).length;
    const upcomingSeedCount = mergeBrowseSection(curatedUpcoming, featuredUpcoming, BROWSE_SORT_POOL_LIMIT)
      .length;

    if (isIgdbConfigured()) {
      [popularFromIgdb, upcomingFromIgdb] = await Promise.all([
        popularSeedCount < BROWSE_SORT_POOL_LIMIT
          ? buildIgdbPopularNow(cc, BROWSE_SORT_POOL_LIMIT)
          : Promise.resolve([]),
        upcomingSeedCount < BROWSE_SORT_POOL_LIMIT
          ? buildIgdbUpcomingReleases(cc, BROWSE_SORT_POOL_LIMIT)
          : Promise.resolve([]),
      ]);
    }

    const popularPool = mergeBrowseSection(
      mergeBrowseSection(curatedPopular, featuredPopular, BROWSE_SORT_POOL_LIMIT),
      popularFromIgdb,
      BROWSE_SORT_POOL_LIMIT
    );

    const upcomingPool = mergeBrowseSection(
      mergeBrowseSection(curatedUpcoming, featuredUpcoming, BROWSE_SORT_POOL_LIMIT),
      upcomingFromIgdb,
      BROWSE_SORT_POOL_LIMIT
    );

    const [popularMerged, upcomingMerged] = await Promise.all([
      sortFeaturedBrowseGames(popularPool, cc, "popular").then(finalizeBrowsePool),
      sortFeaturedBrowseGames(upcomingPool, cc, "upcoming").then(finalizeBrowsePool),
    ]);

    const response: SteamBrowseResponse = {
      popular: popularMerged,
      upcomingReleases: upcomingMerged,
    };

    if (
      response.popular.length >= MIN_CACHED_POPULAR &&
      response.upcomingReleases.length >= MIN_CACHED_UPCOMING
    ) {
      browseCache.set(cc, { data: response, at: Date.now() });
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to fetch browse data" }, { status: 500 });
  }
}
