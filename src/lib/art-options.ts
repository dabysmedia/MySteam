import type { BacklogGame, SteamGameDetails } from "@/lib/types";
import type { IgdbMedia } from "@/lib/igdb";

export interface ArtOption {
  id: string;
  url: string;
  label: string;
}

function addOption(
  options: ArtOption[],
  seen: Set<string>,
  id: string,
  url: string | undefined,
  label: string
) {
  if (!url || seen.has(url)) return;
  seen.add(url);
  options.push({ id, url, label });
}

export function getDefaultArtUrl(
  game: Pick<BacklogGame, "headerImage" | "backgroundImage">
): string {
  return game.headerImage || game.backgroundImage || "";
}

export function buildArtOptionsFromBacklog(
  game: Pick<BacklogGame, "headerImage" | "backgroundImage" | "screenshotImage">
): ArtOption[] {
  const options: ArtOption[] = [];
  const seen = new Set<string>();
  addOption(options, seen, "header", game.headerImage, "Header");
  addOption(options, seen, "background", game.backgroundImage, "Background");
  addOption(options, seen, "screenshot", game.screenshotImage, "Screenshot");
  return options;
}

export function buildArtOptionsFromIgdb(igdb: IgdbMedia): ArtOption[] {
  const options: ArtOption[] = [];
  const seen = new Set<string>();

  addOption(options, seen, "igdb-cover", igdb.coverUrl ?? undefined, "Cover (HD)");
  igdb.artworkUrls.forEach((url, index) => {
    addOption(options, seen, `igdb-art-${index}`, url, `Artwork ${index + 1} (HD)`);
  });
  igdb.screenshotUrls.forEach((url, index) => {
    addOption(options, seen, `igdb-shot-${index}`, url, `Screenshot ${index + 1} (HD)`);
  });

  return options;
}

export function buildArtOptionsFromSteam(game: SteamGameDetails): ArtOption[] {
  const options: ArtOption[] = [];
  const seen = new Set<string>();

  addOption(options, seen, "header", game.header_image, "Header");
  addOption(options, seen, "background", game.background_raw || game.background, "Background");
  if (game.capsule_image) addOption(options, seen, "capsule", game.capsule_image, "Capsule");

  game.screenshots?.forEach((s, i) => {
    addOption(options, seen, `screenshot-${s.id}`, s.path_full, `Shot ${i + 1}`);
  });

  game.movies?.forEach((m, i) => {
    addOption(options, seen, `trailer-${m.id}`, m.thumbnail, `Trailer ${i + 1}`);
  });

  return options;
}

export function mergeArtOptions(...lists: ArtOption[][]): ArtOption[] {
  const options: ArtOption[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const option of list) {
      if (seen.has(option.url)) continue;
      seen.add(option.url);
      options.push(option);
    }
  }
  return options;
}
