"use client";

export interface DismissedGame {
  appId: number;
  name: string;
  dismissedAt: string;
}

const STORAGE_KEY = "mysteam-dismissed-games";
export const DISMISSED_GAMES_CHANGED_EVENT = "mysteam-dismissed-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getDismissedGames(): DismissedGame[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DismissedGame[];
  } catch {
    return [];
  }
}

export function getDismissedAppIds(): Set<number> {
  return new Set(getDismissedGames().map((game) => game.appId));
}

export function isDismissed(appId: number): boolean {
  return getDismissedGames().some((game) => game.appId === appId);
}

function writeDismissedGames(games: DismissedGame[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  window.dispatchEvent(new CustomEvent(DISMISSED_GAMES_CHANGED_EVENT, { detail: games }));
}

export function dismissGame(appId: number, name: string): void {
  const existing = getDismissedGames();
  if (existing.some((game) => game.appId === appId)) return;

  writeDismissedGames([
    { appId, name, dismissedAt: new Date().toISOString() },
    ...existing,
  ]);
}

export function restoreDismissedGame(appId: number): void {
  writeDismissedGames(getDismissedGames().filter((game) => game.appId !== appId));
}
