import { NextRequest, NextResponse } from "next/server";
import type { SteamBrowseResponse, SteamFeaturedItem } from "@/lib/browse-types";
import { buildCuratedPopularGames, filterFeaturedGames } from "@/lib/steam-search-filters";

interface CategoryBlock {
  name?: string;
  items?: SteamFeaturedItem[];
}

interface FeaturedCategoriesResponse {
  top_sellers?: CategoryBlock;
  new_releases?: CategoryBlock;
  coming_soon?: CategoryBlock;
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

    const [popular, newReleases, comingSoon] = await Promise.all([
      buildCuratedPopularGames(cc),
      filterFeaturedGames(data.new_releases?.items ?? [], cc),
      filterFeaturedGames(data.coming_soon?.items ?? [], cc),
    ]);

    const response: SteamBrowseResponse = {
      popular,
      newReleases,
      comingSoon,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Failed to fetch browse data" }, { status: 500 });
  }
}
