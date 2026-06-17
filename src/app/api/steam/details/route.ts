import { NextRequest, NextResponse } from "next/server";
import type { SteamAppDetailsResponse } from "@/lib/types";
import { getIgdbMediaBySteamAppId, isIgdbConfigured } from "@/lib/igdb";
import { mergeGameDetailsWithIgdb } from "@/lib/game-media";

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

  if (!appId || !/^\d+$/.test(appId)) {
    return NextResponse.json({ error: "Valid appId required" }, { status: 400 });
  }

  try {
    const url = new URL("https://store.steampowered.com/api/appdetails");
    url.searchParams.set("appids", appId);
    url.searchParams.set("cc", cc);
    url.searchParams.set("l", "english");

    const [res, igdbMedia] = await Promise.all([
      fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "MySteam/1.0",
        },
        next: { revalidate: 3600 },
      }),
      isIgdbConfigured()
        ? getIgdbMediaBySteamAppId(Number(appId))
        : Promise.resolve(null),
    ]);

    if (!res.ok) {
      return NextResponse.json({ error: "Steam details fetch failed" }, { status: res.status });
    }

    const data = (await res.json()) as SteamAppDetailsResponse;
    const entry = data[appId];

    if (!entry?.success || !entry.data) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(mergeGameDetailsWithIgdb(entry.data, igdbMedia));
  } catch {
    return NextResponse.json({ error: "Failed to fetch game details" }, { status: 500 });
  }
}
