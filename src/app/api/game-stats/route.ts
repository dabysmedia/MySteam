import { NextRequest, NextResponse } from "next/server";
import { searchHltb } from "@/lib/hltb";
import { fetchSteamAppDetails } from "@/lib/steam-app-details";

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
    const [steamDetails, hltb] = await Promise.all([
      fetchSteamAppDetails(Number(appId), cc),
      searchHltb(name.trim()),
    ]);

    const metacritic = steamDetails?.metacritic;

    return NextResponse.json({
      metacritic,
      hltb: hltb ?? undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch game stats" }, { status: 500 });
  }
}
