export interface HltbTimes {
  gameId: number;
  gameName: string;
  mainHours: number | null;
  mainExtraHours: number | null;
  completionistHours: number | null;
  hltbUrl: string;
}

const HLTB_BASE = "https://howlongtobeat.com";
const HLTB_API_URL_FIXTURE =
  "https://raw.githubusercontent.com/rommapp/romm/refs/heads/master/backend/handler/metadata/fixtures/hltb_api_url";
const BUILD_ID_CACHE_MS = 60 * 60 * 1000;

let cachedBuildId: string | null = null;
let buildIdExpiry = 0;
let cachedApiUrl: string | null = null;
let cachedToken: { token: string; hpKey: string; hpVal: string; expires: number } | null = null;

function secondsToHours(seconds: number | null | undefined): number | null {
  if (seconds == null || seconds <= 0) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

function nameSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const nb = b.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.85;
  const aw = new Set(na.split(" ").filter((w) => w.length > 2));
  const bw = new Set(nb.split(" ").filter((w) => w.length > 2));
  let overlap = 0;
  for (const w of aw) if (bw.has(w)) overlap++;
  return overlap / Math.max(aw.size, bw.size, 1);
}

async function getApiUrl(): Promise<string> {
  if (cachedApiUrl) return cachedApiUrl;
  try {
    const res = await fetch(HLTB_API_URL_FIXTURE, { next: { revalidate: 3600 } });
    if (res.ok) {
      const url = (await res.text()).trim();
      if (url.startsWith("http")) {
        cachedApiUrl = url;
        return url;
      }
    }
  } catch {
    // use fallback
  }
  cachedApiUrl = `${HLTB_BASE}/api/bleed`;
  return cachedApiUrl;
}

async function getAuthHeaders(): Promise<{
  token: string;
  hpKey: string;
  hpVal: string;
} | null> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken;
  }

  const apiUrl = await getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/init?t=${Date.now()}`, {
      headers: {
        Referer: HLTB_BASE,
        "User-Agent": "MySteam/1.0",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.token || !data.hpKey || !data.hpVal) return null;
    cachedToken = {
      token: data.token,
      hpKey: data.hpKey,
      hpVal: data.hpVal,
      expires: Date.now() + 5 * 60 * 1000,
    };
    return cachedToken;
  } catch {
    return null;
  }
}

interface HltbRawGame {
  game_id: number;
  game_name: string;
  comp_main?: number;
  comp_plus?: number;
  comp_100?: number;
}

async function searchHltbApi(gameName: string): Promise<HltbRawGame | null> {
  const auth = await getAuthHeaders();
  if (!auth) return null;

  const apiUrl = await getApiUrl();
  const searchTerms = gameName.split(" ").filter(Boolean);
  const body: Record<string, unknown> = {
    searchType: "games",
    searchTerms,
    searchPage: 1,
    size: 10,
    searchOptions: {
      games: {
        userId: 0,
        platform: "",
        sortCategory: "popular",
        rangeCategory: "main",
        rangeTime: { min: 0, max: 0 },
        gameplay: { perspective: "", flow: "", genre: "", difficulty: "" },
        rangeYear: { max: "", min: "" },
        modifier: "",
      },
      users: { sortCategory: "postcount" },
      lists: { sortCategory: "follows" },
      filter: "",
      sort: 0,
      randomizer: 0,
    },
    useCache: true,
  };
  body[auth.hpKey] = auth.hpVal;

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: HLTB_BASE,
        "User-Agent": "MySteam/1.0",
        "x-auth-token": auth.token,
        "x-hp-key": auth.hpKey,
        "x-hp-val": auth.hpVal,
      },
      body: JSON.stringify(body),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const results: HltbRawGame[] = data.data ?? [];
    if (results.length === 0) return null;

    return (
      results
        .map((g) => ({ g, score: nameSimilarity(gameName, g.game_name) }))
        .sort((a, b) => b.score - a.score)[0]?.g ?? null
    );
  } catch {
    return null;
  }
}

async function getBuildId(): Promise<string | null> {
  if (cachedBuildId && Date.now() < buildIdExpiry) return cachedBuildId;
  try {
    const res = await fetch(`${HLTB_BASE}/game/1`, {
      headers: { "User-Agent": "MySteam/1.0" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    const buildId = JSON.parse(match[1]).buildId as string;
    cachedBuildId = buildId;
    buildIdExpiry = Date.now() + BUILD_ID_CACHE_MS;
    return buildId;
  } catch {
    return null;
  }
}

function rawToTimes(raw: HltbRawGame): HltbTimes {
  return {
    gameId: raw.game_id,
    gameName: raw.game_name,
    mainHours: secondsToHours(raw.comp_main),
    mainExtraHours: secondsToHours(raw.comp_plus),
    completionistHours: secondsToHours(raw.comp_100),
    hltbUrl: `${HLTB_BASE}/game/${raw.game_id}`,
  };
}

export async function fetchHltbById(gameId: number): Promise<HltbTimes | null> {
  const buildId = await getBuildId();
  if (!buildId) return null;

  try {
    const res = await fetch(`${HLTB_BASE}/_next/data/${buildId}/game/${gameId}.json`, {
      headers: {
        "User-Agent": "MySteam/1.0",
        "x-nextjs-data": "1",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const raw = json?.pageProps?.game?.data?.game?.[0] as HltbRawGame | undefined;
    if (!raw) return null;
    return rawToTimes(raw);
  } catch {
    return null;
  }
}

export async function searchHltb(gameName: string): Promise<HltbTimes | null> {
  const result = await searchHltbApi(gameName);
  if (!result) return null;
  if (nameSimilarity(gameName, result.game_name) < 0.35) return null;
  return rawToTimes(result);
}
