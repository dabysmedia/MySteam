import { NextRequest, NextResponse } from "next/server";
import type { SteamAppDetailsResponse } from "@/lib/types";
import { searchHltb } from "@/lib/hltb";

export async function GET(request: NextRequest) {
  const appId = request.nextUrl.searchParams.get("appId");
  const name = request.nextUrl.searchParams.get("name");
  const cc = request.nextUrl.searchParams.get("cc") ?? "US";

  if (!appId || !/^\d+$/.test(appId)) {
    return NextResponse.json({ error: "Valid appId required" }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "Game name required" }, { status: 400 });
  }

  try {
    const [steamRes, hltb] = await Promise.all([
      fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cc}&l=english`,
        {
          headers: { Accept: "application/json", "User-Agent": "MySteam/1.0" },
          next: { revalidate: 86400 },
        }
      ),
      searchHltb(name.trim()),
    ]);

    let metacritic: { score: number; url: string } | undefined;
    if (steamRes.ok) {
      const data = (await steamRes.json()) as SteamAppDetailsResponse;
      const entry = data[appId];
      if (entry?.success && entry.data?.metacritic) {
        metacritic = entry.data.metacritic;
      }
    }

    return NextResponse.json({
      metacritic,
      hltb: hltb ?? undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch game stats" }, { status: 500 });
  }
}
