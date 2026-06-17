import type { BacklogGame } from "./types";

export function formatPlaytimeHours(hours: number | null | undefined): string | null {
  if (hours == null || hours <= 0) return null;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 10) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours)}h`;
}

/** Prefer main + extra, then main story, then completionist */
export function getHltbDisplayHours(
  game: Pick<BacklogGame, "hltbMainHours" | "hltbMainExtraHours" | "hltbCompletionistHours">
): number | null {
  return game.hltbMainExtraHours ?? game.hltbMainHours ?? game.hltbCompletionistHours ?? null;
}

export function getHltbDisplayLabel(
  game: Pick<BacklogGame, "hltbMainHours" | "hltbMainExtraHours" | "hltbCompletionistHours">
): string {
  if (game.hltbMainExtraHours != null) return "HLTB main + extra";
  if (game.hltbMainHours != null) return "HLTB main story";
  return "HLTB completionist";
}

export function formatHltbDisplayTime(
  game: Pick<BacklogGame, "hltbMainHours" | "hltbMainExtraHours" | "hltbCompletionistHours">
): string | null {
  return formatPlaytimeHours(getHltbDisplayHours(game));
}

export function hasHltbData(
  game: Pick<BacklogGame, "hltbMainHours" | "hltbMainExtraHours" | "hltbCompletionistHours">
): boolean {
  return getHltbDisplayHours(game) != null;
}

export function metacriticTone(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function metacriticClass(score: number): string {
  const tone = metacriticTone(score);
  if (tone === "high") return "text-[#6dcc00] bg-[#6dcc00]/15 border-[#6dcc00]/35";
  if (tone === "mid") return "text-[#e8c547] bg-[#e8c547]/15 border-[#e8c547]/35";
  return "text-[#c75b5b] bg-[#c75b5b]/15 border-[#c75b5b]/35";
}

export function hltbBadgeClass(): string {
  return "text-[#b794f6] bg-[#b794f6]/15 border-[#b794f6]/35";
}
