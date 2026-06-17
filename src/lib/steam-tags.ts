const STEAM_PLATFORM_CATEGORIES = new Set([
  "Steam Achievements",
  "Steam Cloud",
  "Family Sharing",
  "Steam Trading Cards",
  "Steam Workshop",
  "Includes level editor",
  "Includes Source SDK",
  "Steam Leaderboards",
  "Remote Play on Phone",
  "Remote Play on Tablet",
  "Remote Play on TV",
  "Remote Play Together",
  "Steam Turn Notifications",
  "Steam Timeline",
  "Captions available",
  "Commentary available",
  "Stats",
  "SteamVR Collectibles",
  "Valve Anti-Cheat enabled",
  "In-App Purchases",
  "MMO",
]);

export function extractSteamGenres(genres?: { description: string }[]): string[] {
  return (genres ?? []).map((g) => g.description);
}

export function extractSteamTags(categories?: { description: string }[]): string[] {
  return (categories ?? [])
    .map((c) => c.description)
    .filter((d) => !STEAM_PLATFORM_CATEGORIES.has(d));
}

/** Up to 2 Steam genres for queue rows (e.g. Action · RPG) */
export function formatQueueGenres(genres?: string[]): string[] {
  return (genres ?? []).slice(0, 2);
}
