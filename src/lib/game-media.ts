import type { SteamGameDetails, SteamMovie, SteamScreenshot } from "@/lib/types";
import type { IgdbGameDetails, IgdbMedia, IgdbVideo } from "@/lib/igdb";
import { steamHeaderImageUrl } from "@/lib/steam-app-details";
import { getTrailerSource } from "@/lib/steam-video";
import { youtubeMaxThumbnailUrl } from "@/lib/youtube-player";

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

export function igdbVideosToSteamMovies(videos: IgdbVideo[]): SteamMovie[] {
  return videos.map((video, index) => ({
    id: -10_000 - index,
    name: video.name,
    thumbnail: youtubeMaxThumbnailUrl(video.videoId),
    youtube_id: video.videoId,
    highlight: index === 0,
  }));
}

function isSteamNativeTrailer(movie: SteamMovie): boolean {
  return Boolean(
    movie.hls_h264 ||
      movie.mp4?.max ||
      movie.mp4?.["480"] ||
      movie.webm?.max ||
      movie.webm?.["480"]
  );
}

function withHighlight(movies: SteamMovie[]): SteamMovie[] {
  if (movies.length === 0) return movies;
  if (movies.some((movie) => movie.highlight)) return movies;
  return movies.map((movie, index) =>
    index === 0 ? { ...movie, highlight: true } : movie
  );
}

function mergeTrailers(steamMovies: SteamMovie[] | undefined, igdbVideos: IgdbVideo[]): SteamMovie[] | undefined {
  const playableSteam = (steamMovies ?? []).filter((movie) => getTrailerSource(movie) !== null);

  if (playableSteam.some(isSteamNativeTrailer)) {
    const nativeSteam = playableSteam.filter(isSteamNativeTrailer);
    return nativeSteam.length > 0 ? withHighlight(nativeSteam) : undefined;
  }

  const igdbMovies = igdbVideosToSteamMovies(igdbVideos).filter((movie) => getTrailerSource(movie) !== null);

  const seenYoutube = new Set<string>();
  for (const movie of playableSteam) {
    if (movie.youtube_id) seenYoutube.add(movie.youtube_id);
  }

  const merged: SteamMovie[] = [...playableSteam];
  for (const movie of igdbMovies) {
    if (movie.youtube_id && seenYoutube.has(movie.youtube_id)) continue;
    merged.push({ ...movie, highlight: false });
    if (movie.youtube_id) seenYoutube.add(movie.youtube_id);
  }

  if (merged.length === 0) return undefined;

  return withHighlight(merged);
}

/** Prefer IGDB HD assets; keep Steam data as fallback for anything missing. */
export function mergeGameDetailsWithIgdb(
  steam: SteamGameDetails,
  igdb: IgdbGameDetails | null
): EnrichedSteamGameDetails {
  if (!igdb) return { ...steam };

  const igdbShots = igdbScreenshots(igdb.media.screenshotUrls, -1);
  const igdbArt = igdbScreenshots(igdb.media.artworkUrls, -1000);
  const steamShots = steam.screenshots ?? [];

  const seen = new Set<string>();
  const screenshots: SteamScreenshot[] = [];
  for (const shot of [...igdbShots, ...igdbArt, ...steamShots]) {
    if (seen.has(shot.path_full)) continue;
    seen.add(shot.path_full);
    screenshots.push(shot);
  }

  const background =
    igdb.media.artworkUrls[0] ??
    igdb.media.screenshotUrls[0] ??
    steam.background_raw ??
    steam.background;

  const movies = mergeTrailers(steam.movies, igdb.videos);

  return {
    ...steam,
    header_image: igdb.media.coverUrl ?? steam.header_image,
    background_raw: background,
    background: background ?? steam.background,
    screenshots: screenshots.length > 0 ? screenshots : steam.screenshots,
    movies: movies ?? steam.movies,
    igdbMedia: igdb.media,
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function igdbMediaToScreenshots(media: IgdbMedia): SteamScreenshot[] {
  const shots = [...media.screenshotUrls, ...media.artworkUrls];
  return shots.map((url, index) => ({
    id: -index - 1,
    path_full: url,
    path_thumbnail: url,
  }));
}

function formatIgdbReleaseDate(timestamp?: number): { coming_soon: boolean; date: string } {
  if (!timestamp) {
    return { coming_soon: true, date: "Coming Soon" };
  }

  const release = new Date(timestamp * 1000);
  const comingSoon = release.getTime() > Date.now();
  const date = release.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return { coming_soon: comingSoon, date };
}

/** Build Steam-shaped details when the store API has no data (common for unreleased games). */
export function buildGameDetailsFromIgdb(appId: number, igdb: IgdbGameDetails): SteamGameDetails {
  const description = igdb.storyline?.trim() || igdb.summary?.trim() || "";
  const htmlDescription = description ? textToHtml(description) : "";
  const headerImage = igdb.media.coverUrl ?? steamHeaderImageUrl(appId);
  const background =
    igdb.media.artworkUrls[0] ?? igdb.media.screenshotUrls[0] ?? headerImage;
  const screenshots = igdbMediaToScreenshots(igdb.media);

  return {
    type: "game",
    name: igdb.media.name,
    steam_appid: appId,
    short_description: description.slice(0, 300),
    detailed_description: htmlDescription,
    about_the_game: htmlDescription,
    header_image: headerImage,
    background_raw: background,
    background,
    is_free: false,
    developers: igdb.developers.length > 0 ? igdb.developers : undefined,
    publishers: igdb.publishers.length > 0 ? igdb.publishers : undefined,
    genres:
      igdb.genres.length > 0
        ? igdb.genres.map((name, index) => ({ id: String(index), description: name }))
        : undefined,
    release_date: formatIgdbReleaseDate(igdb.firstReleaseDate),
    platforms: igdb.platforms,
    screenshots: screenshots.length > 0 ? screenshots : undefined,
  };
}
