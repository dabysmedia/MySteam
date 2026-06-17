import { NextRequest, NextResponse } from "next/server";
import { getIgdbMediaBySteamAppId, isIgdbConfigured, searchIgdbMediaByName } from "@/lib/igdb";

export async function GET(request: NextRequest) {
  if (!isIgdbConfigured()) {
    return NextResponse.json({ error: "IGDB is not configured" }, { status: 503 });
  }

  const { searchParams } = request.nextUrl;
  const appIdParam = searchParams.get("appId");
  const name = searchParams.get("name")?.trim();

  if (appIdParam) {
    const appId = Number(appIdParam);
    if (!Number.isFinite(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
    }

    const media = await getIgdbMediaBySteamAppId(appId);
    if (!media) {
      return NextResponse.json({ error: "Game not found on IGDB" }, { status: 404 });
    }

    return NextResponse.json(media);
  }

  if (name) {
    const results = await searchIgdbMediaByName(name);
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Provide appId or name" }, { status: 400 });
}
