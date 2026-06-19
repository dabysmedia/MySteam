import Hls from "hls.js";
import type { SteamMovie } from "./types";

export interface TrailerSource {
  url: string;
  type: "hls" | "mp4" | "webm" | "youtube";
  label: string;
}

/** Pick the highest-quality playable trailer URL from a Steam/IGDB movie object. */
export function getTrailerSource(movie: SteamMovie): TrailerSource | null {
  if (movie.mp4?.max) {
    return { url: movie.mp4.max, type: "mp4", label: movie.name };
  }

  if (movie.hls_h264) {
    return { url: movie.hls_h264, type: "hls", label: movie.name };
  }

  if (movie.webm?.max) {
    return { url: movie.webm.max, type: "webm", label: movie.name };
  }

  if (movie.mp4?.["480"]) {
    return { url: movie.mp4["480"], type: "mp4", label: movie.name };
  }

  if (movie.webm?.["480"]) {
    return { url: movie.webm["480"], type: "webm", label: movie.name };
  }

  if (movie.youtube_id) {
    return { url: movie.youtube_id, type: "youtube", label: movie.name };
  }

  if (movie.dash_h264) {
    // DASH manifests need a player library; prefer HLS/MP4 when available.
    return null;
  }

  return null;
}

export function createMaxQualityHls(): Hls {
  return new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    capLevelToPlayerSize: false,
    startLevel: -1,
  });
}

/** Lock adaptive HLS streams to their highest available rendition. */
export function lockHlsToMaxQuality(hls: Hls): void {
  const pickMaxLevel = () => {
    if (hls.levels.length > 0) {
      hls.currentLevel = hls.levels.length - 1;
    }
  };

  hls.on(Hls.Events.MANIFEST_PARSED, pickMaxLevel);
}

export function getHighlightTrailer(movies?: SteamMovie[]): SteamMovie | null {
  if (!movies?.length) return null;
  return movies.find((m) => m.highlight) ?? movies[0];
}

export function getPlayableTrailers(movies?: SteamMovie[]): SteamMovie[] {
  if (!movies?.length) return [];
  return movies.filter((m) => getTrailerSource(m) !== null);
}
