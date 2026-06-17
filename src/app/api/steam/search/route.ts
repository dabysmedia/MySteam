import { NextRequest, NextResponse } from "next/server";
import { filterSteamSearchResults } from "@/lib/steam-search-filters";
import type { SteamSearchResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("term");
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

  if (!term || term.trim().length < 2) {
    return NextResponse.json({ error: "Search term must be at least 2 characters" }, { status: 400 });
  }

  try {
    const url = new URL("https://store.steampowered.com/api/storesearch/");
    url.searchParams.set("term", term.trim());
    url.searchParams.set("cc", cc);
    url.searchParams.set("l", "english");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "MySteam/1.0",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Steam search failed" }, { status: res.status });
    }

    const data = (await res.json()) as SteamSearchResponse;
    const apps = (data.items ?? []).filter((item) => item.type === "app");
    const games = await filterSteamSearchResults(apps, cc);

    return NextResponse.json({ total: games.length, items: games });
  } catch {
    return NextResponse.json({ error: "Failed to search Steam store" }, { status: 500 });
  }
}
