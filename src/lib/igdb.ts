const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_BASE = "https://api.igdb.com/v4";

/** IGDB external game category for Steam. */
const STEAM_EXTERNAL_CATEGORY = 1;

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface IgdbImageRef {
  image_id?: string;
}

interface IgdbExternalGameRef {
  uid?: string;
  category?: number;
  external_game_source?: number;
}

interface IgdbGameRow {
  id: number;
  name: string;
  cover?: IgdbImageRef;
  screenshots?: IgdbImageRef[];
  artworks?: IgdbImageRef[];
  external_games?: IgdbExternalGameRef[];
  summary?: string;
  storyline?: string;
  first_release_date?: number;
  status?: number;
  genres?: { name?: string }[];
  platforms?: { name?: string }[];
  involved_companies?: {
    company?: { name?: string };
    developer?: boolean;
    publisher?: boolean;
  }[];
  videos?: { name?: string; video_id?: string }[];
}

export interface IgdbMedia {
  igdbId: number;
  name: string;
  coverUrl: string | null;
  screenshotUrls: string[];
  artworkUrls: string[];
}

export interface IgdbVideo {
  name: string;
  videoId: string;
}

export interface IgdbGameDetails {
  media: IgdbMedia;
  summary?: string;
  storyline?: string;
  firstReleaseDate?: number;
  developers: string[];
  publishers: string[];
  genres: string[];
  platforms: { windows: boolean; mac: boolean; linux: boolean };
  videos: IgdbVideo[];
}

const IGDB_DETAIL_FIELDS =
  "name, summary, storyline, first_release_date, status, cover.image_id, screenshots.image_id, artworks.image_id, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher, external_games.uid, external_games.external_game_source, videos.name, videos.video_id";

let cachedToken: { token: string; expiresAt: number } | null = null;

function getIgdbCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.IGDB_CLIENT_ID?.trim();
  const clientSecret = process.env.IGDB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function isIgdbConfigured(): boolean {
  return getIgdbCredentials() !== null;
}

export function igdbImageUrl(imageId: string, size = "t_cover_big"): string {
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.jpg`;
}

async function getAccessToken(): Promise<string | null> {
  const creds = getIgdbCredentials();
  if (!creds) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    grant_type: "client_credentials",
  });

  try {
    const res = await fetch(`${TWITCH_TOKEN_URL}?${params.toString()}`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as TwitchTokenResponse;
    if (!data.access_token) return null;

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

async function igdbQuery<T>(endpoint: string, body: string): Promise<T[] | null> {
  const token = await getAccessToken();
  const creds = getIgdbCredentials();
  if (!token || !creds) return null;

  try {
    const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Client-ID": creds.clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

function mapGameRow(game: IgdbGameRow): IgdbMedia {
  return {
    igdbId: game.id,
    name: game.name,
    coverUrl: game.cover?.image_id ? igdbImageUrl(game.cover.image_id, "t_1080p") : null,
    screenshotUrls: (game.screenshots ?? [])
      .map((s) => s.image_id)
      .filter((id): id is string => Boolean(id))
      .map((id) => igdbImageUrl(id, "t_1080p")),
    artworkUrls: (game.artworks ?? [])
      .map((a) => a.image_id)
      .filter((id): id is string => Boolean(id))
      .map((id) => igdbImageUrl(id, "t_1080p")),
  };
}

function pickSteamGame(games: IgdbGameRow[], appId: number): IgdbGameRow | null {
  if (!games.length) return null;

  const appIdStr = String(appId);
  const hasSteamLink = (game: IgdbGameRow, source?: number) =>
    game.external_games?.some(
      (entry) =>
        entry.uid === appIdStr &&
        (source === undefined
          ? externalGameSource(entry) == null
          : externalGameSource(entry) === source)
    );

  return (
    games.find((game) => hasSteamLink(game, STEAM_EXTERNAL_CATEGORY)) ??
    games.find((game) => hasSteamLink(game)) ??
    games[0]
  );
}

function mapDetailedGameRow(game: IgdbGameRow): IgdbGameDetails {
  const companies = game.involved_companies ?? [];
  const developers = companies
    .filter((entry) => entry.developer)
    .map((entry) => entry.company?.name)
    .filter((name): name is string => Boolean(name));
  const publishers = companies
    .filter((entry) => entry.publisher)
    .map((entry) => entry.company?.name)
    .filter((name): name is string => Boolean(name));

  const platformNames = (game.platforms ?? [])
    .map((platform) => platform.name ?? "")
    .join(" ");

  return {
    media: mapGameRow(game),
    summary: game.summary,
    storyline: game.storyline,
    firstReleaseDate: game.first_release_date,
    developers,
    publishers,
    genres: (game.genres ?? [])
      .map((genre) => genre.name)
      .filter((name): name is string => Boolean(name)),
    platforms: {
      windows: /windows|pc/i.test(platformNames) || platformNames.length === 0,
      mac: /mac/i.test(platformNames),
      linux: /linux/i.test(platformNames),
    },
    videos: (game.videos ?? [])
      .filter((video) => video.video_id?.trim())
      .map((video) => ({
        name: video.name?.trim() || "Trailer",
        videoId: video.video_id!.trim(),
      })),
  };
}

export async function getIgdbMediaBySteamAppId(appId: number): Promise<IgdbMedia | null> {
  const details = await getIgdbGameDetailsBySteamAppId(appId);
  return details?.media ?? null;
}

export async function getIgdbGameDetailsBySteamAppId(appId: number): Promise<IgdbGameDetails | null> {
  const games = await igdbQuery<IgdbGameRow>(
    "games",
    `fields ${IGDB_DETAIL_FIELDS};
where external_games.uid = "${appId}";
limit 10;`
  );

  const game = games ? pickSteamGame(games, appId) : null;
  if (!game) return null;
  return mapDetailedGameRow(game);
}

export async function searchIgdbMediaByName(name: string, limit = 5): Promise<IgdbMedia[]> {
  const escaped = name.replace(/"/g, '\\"');
  const games = await igdbQuery<IgdbGameRow>(
    "games",
    `search "${escaped}";
fields name, cover.image_id, screenshots.image_id, artworks.image_id;
limit ${limit};`
  );

  if (!games?.length) return [];
  return games.map(mapGameRow);
}

/** Verify Twitch OAuth credentials without making an IGDB query. */
export async function verifyIgdbAuth(): Promise<boolean> {
  return (await getAccessToken()) !== null;
}

function externalGameSource(entry: IgdbExternalGameRef): number | undefined {
  return entry.external_game_source ?? entry.category;
}

export function getSteamAppIdFromIgdbGame(game: {
  external_games?: IgdbExternalGameRef[];
}): number | null {
  const links = game.external_games ?? [];
  const steamLink = links.find(
    (entry) =>
      externalGameSource(entry) === STEAM_EXTERNAL_CATEGORY &&
      /^\d{1,9}$/.test(entry.uid ?? "")
  );

  if (!steamLink?.uid) return null;
  const appId = Number(steamLink.uid);
  return Number.isFinite(appId) && appId > 0 && appId < 1_000_000_000 ? appId : null;
}

export async function fetchIgdbGamesByIds(
  ids: number[],
  fields: string
): Promise<IgdbGameRow[]> {
  if (!ids.length || !isIgdbConfigured()) return [];

  const games = await igdbQuery<IgdbGameRow>(
    "games",
    `fields ${fields}; where id = (${ids.join(",")}); limit ${ids.length};`
  );

  return games ?? [];
}

export async function fetchIgdbPopularGameIds(
  popularityType: number,
  limit: number
): Promise<number[]> {
  const rows = await igdbQuery<{ game_id: number }>(
    "popularity_primitives",
    `fields game_id; where popularity_type = ${popularityType}; sort value desc; limit ${limit};`
  );

  return rows?.map((row) => row.game_id) ?? [];
}
