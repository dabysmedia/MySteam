import type { SteamAppDetailsResponse, SteamGameDetails } from "@/lib/types";

export const STEAM_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://store.steampowered.com/",
};

export function steamHeaderImageUrl(appId: number): string {
  return `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
}

async function fetchSteamAppDetailsForRegion(
  appId: number,
  cc: string
): Promise<SteamGameDetails | null> {
  const url = new URL("https://store.steampowered.com/api/appdetails");
  url.searchParams.set("appids", String(appId));
  url.searchParams.set("cc", cc);
  url.searchParams.set("l", "english");

  const res = await fetch(url.toString(), {
    headers: STEAM_FETCH_HEADERS,
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return null;

  const data = (await res.json()) as SteamAppDetailsResponse;
  const entry = data[String(appId)];
  if (!entry?.success || !entry.data) return null;

  return entry.data;
}

/** Fetch Steam store details, trying alternate regions when the primary fails. */
export async function fetchSteamAppDetails(
  appId: number,
  cc = "US"
): Promise<SteamGameDetails | null> {
  const regions = [cc, "US", "GB", "DE", "KR"].filter((region, index, all) => all.indexOf(region) === index);

  for (const region of regions) {
    try {
      const details = await fetchSteamAppDetailsForRegion(appId, region);
      if (details) return details;
    } catch {
      // Try the next region.
    }
  }

  return null;
}
