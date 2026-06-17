import type { SteamGameDetails, SteamScreenshot } from "@/lib/types";
import type { IgdbMedia } from "@/lib/igdb";

export interface EnrichedSteamGameDetails extends SteamGameDetails {
  igdbMedia?: IgdbMedia;
}

function igdbScreenshots(urls: string[], idStart: number): SteamScreenshot[] {
  return urls.map((url, index) => ({
    id: idStart - index,
    path_full: url,
    path_thumbnail: url,
  }));
}

/** Prefer IGDB HD assets; keep Steam data as fallback for anything missing. */
export function mergeGameDetailsWithIgdb(
  steam: SteamGameDetails,
  igdb: IgdbMedia | null
): EnrichedSteamGameDetails {
  if (!igdb) return { ...steam };

  const igdbShots = igdbScreenshots(igdb.screenshotUrls, -1);
  const igdbArt = igdbScreenshots(igdb.artworkUrls, -1000);
  const steamShots = steam.screenshots ?? [];

  const seen = new Set<string>();
  const screenshots: SteamScreenshot[] = [];
  for (const shot of [...igdbShots, ...igdbArt, ...steamShots]) {
    if (seen.has(shot.path_full)) continue;
    seen.add(shot.path_full);
    screenshots.push(shot);
  }

  const background =
    igdb.artworkUrls[0] ??
    igdb.screenshotUrls[0] ??
    steam.background_raw ??
    steam.background;

  return {
    ...steam,
    header_image: igdb.coverUrl ?? steam.header_image,
    background_raw: background,
    background: background ?? steam.background,
    screenshots: screenshots.length > 0 ? screenshots : steam.screenshots,
    igdbMedia: igdb,
  };
}

export function extractBacklogImagesFromDetails(
  data: Pick<SteamGameDetails, "header_image" | "background" | "background_raw" | "screenshots">
) {
  return {
    headerImage: data.header_image,
    backgroundImage: data.background_raw || data.background,
    screenshotImage: data.screenshots?.[0]?.path_full,
  };
}

export function hasIgdbImages(game: {
  headerImage?: string;
  backgroundImage?: string;
  screenshotImage?: string;
}): boolean {
  return [game.headerImage, game.backgroundImage, game.screenshotImage].some((url) =>
    url?.includes("images.igdb.com")
  );
}
