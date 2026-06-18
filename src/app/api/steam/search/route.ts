import { NextRequest, NextResponse } from "next/server";
import { filterSteamSearchResults, isSteamHardware } from "@/lib/steam-search-filters";
import { fetchSteamStoreSearch } from "@/lib/steam-store-search";

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("term");
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";
  const autocomplete = request.nextUrl.searchParams.get("autocomplete") === "1";

  if (!term || term.trim().length < 2) {
    return NextResponse.json({ error: "Search term must be at least 2 characters" }, { status: 400 });
  }

  try {
    const apps = await fetchSteamStoreSearch(term, cc);
    if (apps.length === 0) {
      return NextResponse.json({ error: "No Steam results found" }, { status: 404 });
    }

    const limit = autocomplete ? 8 : 30;
    const candidates = apps.slice(0, limit);

    if (autocomplete) {
      const games = candidates.filter((item) => !isSteamHardware(item));
      return NextResponse.json({ total: games.length, items: games });
    }

    const games = await filterSteamSearchResults(candidates, cc);
    return NextResponse.json({ total: games.length, items: games });
  } catch {
    return NextResponse.json({ error: "Failed to search Steam store" }, { status: 500 });
  }
}
