import { NextRequest, NextResponse } from "next/server";
import type { SteamBrowseResponse, SteamFeaturedItem } from "@/lib/browse-types";
import {
  buildIgdbPopularNow,
  buildIgdbUpcomingReleases,
  BROWSE_POPULAR_LIMIT,
} from "@/lib/igdb-browse";
import { isIgdbConfigured } from "@/lib/igdb";
import { buildCuratedPopularGames, filterUpcomingGames } from "@/lib/steam-search-filters";

interface CategoryBlock {
  name?: string;
  items?: SteamFeaturedItem[];
}

interface FeaturedCategoriesResponse {
  top_sellers?: CategoryBlock;
  new_releases?: CategoryBlock;
  coming_soon?: CategoryBlock;
}

function mergeBrowseSection(
  primary: SteamFeaturedItem[],
  secondary: SteamFeaturedItem[],
  limit = BROWSE_POPULAR_LIMIT
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

export async function GET(request: NextRequest) {
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

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

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch browse data" }, { status: res.status });
    }

    const data = (await res.json()) as FeaturedCategoriesResponse;

    const [popularFromIgdb, curatedPopular, upcomingFromIgdb, upcomingFromSteam] =
      await Promise.all([
        isIgdbConfigured() ? buildIgdbPopularNow(cc, BROWSE_POPULAR_LIMIT) : Promise.resolve([]),
        buildCuratedPopularGames(cc, BROWSE_POPULAR_LIMIT),
        isIgdbConfigured()
          ? buildIgdbUpcomingReleases(cc, BROWSE_POPULAR_LIMIT)
          : Promise.resolve([]),
        filterUpcomingGames(data.coming_soon?.items ?? [], cc, BROWSE_POPULAR_LIMIT),
      ]);

    const response: SteamBrowseResponse = {
      popular: mergeBrowseSection(popularFromIgdb, curatedPopular),
      upcomingReleases: mergeBrowseSection(upcomingFromIgdb, upcomingFromSteam),
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to fetch browse data" }, { status: 500 });
  }
}
