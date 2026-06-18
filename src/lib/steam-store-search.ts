import type { SteamSearchItem, SteamSearchResponse } from "@/lib/types";

interface SteamSearchAppsRow {
  appid: string;
  name: string;
  icon: string;
  logo: string;
}

const STEAM_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://store.steampowered.com/",
};

function mapSearchAppsRow(row: SteamSearchAppsRow): SteamSearchItem | null {
  const id = Number(row.appid);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    type: "app",
    name: row.name,
    id,
    tiny_image: row.logo || row.icon,
    platforms: { windows: true, mac: true, linux: true },
  };
}

async function fetchSteamStoreSearchApi(term: string, cc: string): Promise<SteamSearchItem[]> {
  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", term);
  url.searchParams.set("cc", cc);
  url.searchParams.set("l", "english");

  const res = await fetch(url.toString(), {
    headers: STEAM_FETCH_HEADERS,
    next: { revalidate: 300 },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as SteamSearchResponse;
  return (data.items ?? []).filter((item) => item.type === "app");
}

async function fetchSteamCommunitySearch(term: string): Promise<SteamSearchItem[]> {
  const res = await fetch(
    `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(term)}`,
    {
      headers: STEAM_FETCH_HEADERS,
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) return [];

  const rows = (await res.json()) as SteamSearchAppsRow[];
  return rows
    .map(mapSearchAppsRow)
    .filter((item): item is SteamSearchItem => item !== null);
}

/** Steam store search with community API fallback when storesearch is blocked. */
export async function fetchSteamStoreSearch(term: string, cc = "US"): Promise<SteamSearchItem[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  try {
    const storeResults = await fetchSteamStoreSearchApi(trimmed, cc);
    if (storeResults.length > 0) return storeResults;
  } catch {
    // Fall through to community search.
  }

  try {
    return await fetchSteamCommunitySearch(trimmed);
  } catch {
    return [];
  }
}
