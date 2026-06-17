import type { SteamMovie } from "./types";

export interface TrailerSource {
  url: string;
  type: "hls" | "mp4" | "webm";
  label: string;
}

/** Pick the best playable trailer URL from Steam's movie object. */
export function getTrailerSource(movie: SteamMovie): TrailerSource | null {
  if (movie.hls_h264) {
    return { url: movie.hls_h264, type: "hls", label: movie.name };
  }

  const mp4 = movie.mp4?.max || movie.mp4?.["480"];
  if (mp4) {
    return { url: mp4, type: "mp4", label: movie.name };
  }

  const webm = movie.webm?.max || movie.webm?.["480"];
  if (webm) {
    return { url: webm, type: "webm", label: movie.name };
  }

  if (movie.dash_h264) {
    // DASH manifests need a player library; prefer HLS when available
    return null;
  }

  return null;
}

export function getHighlightTrailer(movies?: SteamMovie[]): SteamMovie | null {
  if (!movies?.length) return null;
  return movies.find((m) => m.highlight) ?? movies[0];
}

export function getPlayableTrailers(movies?: SteamMovie[]): SteamMovie[] {
  if (!movies?.length) return [];
  return movies.filter((m) => getTrailerSource(m) !== null);
}
