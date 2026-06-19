import { NextRequest, NextResponse } from "next/server";
import { getIgdbGameDetailsBySteamAppId, isIgdbConfigured } from "@/lib/igdb";
import { buildGameDetailsFromIgdb, mergeGameDetailsWithIgdb } from "@/lib/game-media";
import { fetchSteamAppDetails } from "@/lib/steam-app-details";

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

  if (!appId || !/^\d+$/.test(appId)) {
    return NextResponse.json({ error: "Valid appId required" }, { status: 400 });
  }

  const appIdNum = Number(appId);

  try {
    const [steamDetails, igdbDetails] = await Promise.all([
      fetchSteamAppDetails(appIdNum, cc),
      isIgdbConfigured() ? getIgdbGameDetailsBySteamAppId(appIdNum) : Promise.resolve(null),
    ]);

    if (steamDetails) {
      return NextResponse.json(mergeGameDetailsWithIgdb(steamDetails, igdbDetails));
    }

    if (igdbDetails) {
      const fallback = buildGameDetailsFromIgdb(appIdNum, igdbDetails);
      return NextResponse.json(mergeGameDetailsWithIgdb(fallback, igdbDetails));
    }

    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch game details" }, { status: 500 });
  }
}
