"use client";

import type { BacklogGame, BacklogStatus } from "./types";
import { readLocalBacklog, writeLocalBacklog, scheduleRemoteSync } from "./backlog-sync";

export function getBacklog(): BacklogGame[] {
  return readLocalBacklog();
}

export function saveBacklog(games: BacklogGame[]): void {
  writeLocalBacklog(games);
  scheduleRemoteSync(games);
}

export function getBacklogGame(appId: number): BacklogGame | undefined {
  return getBacklog().find((g) => g.appId === appId);
}

export function isInBacklog(appId: number): boolean {
  return getBacklog().some((g) => g.appId === appId);
}

function nextQueueOrder(games: BacklogGame[]): number {
  const orders = games
    .filter((g) => g.status === "wishlist")
    .map((g) => g.queueOrder ?? g.priority)
    .filter((o): o is number => o !== undefined);
  return orders.length > 0 ? Math.max(...orders) + 1 : 0;
}

export function addToBacklog(
  game: Pick<
    BacklogGame,
    | "appId"
    | "name"
    | "headerImage"
    | "shortDescription"
    | "backgroundImage"
    | "screenshotImage"
    | "releaseDate"
    | "comingSoon"
    | "genres"
    | "tags"
  >,
  status: BacklogStatus = "wishlist"
): BacklogGame {
  const now = new Date().toISOString();
  const existing = getBacklog();
  const found = existing.find((g) => g.appId === game.appId);
  if (found) return found;

  const entry: BacklogGame = {
    ...game,
    status,
    addedAt: now,
    updatedAt: now,
    ...(status === "wishlist" ? { queueOrder: nextQueueOrder(existing) } : {}),
  };

  saveBacklog([entry, ...existing]);
  return entry;
}

export function updateBacklogStatus(appId: number, status: BacklogStatus): BacklogGame | null {
  const games = getBacklog();
  const index = games.findIndex((g) => g.appId === appId);
  if (index === -1) return null;

  const now = new Date().toISOString();

  if (status === "playing") {
    for (const game of games) {
      if (game.appId !== appId && game.status === "playing") {
        game.status = "wishlist";
        game.updatedAt = now;
      }
    }
  }

  games[index] = {
    ...games[index],
    status,
    updatedAt: now,
  };
  saveBacklog(games);
  return games[index];
}

export function updateBacklogMeta(
  appId: number,
  meta: Pick<
    BacklogGame,
    | "releaseDate"
    | "comingSoon"
    | "backgroundImage"
    | "screenshotImage"
    | "featuredArt"
    | "metacriticScore"
    | "hltbMainHours"
    | "hltbMainExtraHours"
    | "hltbCompletionistHours"
    | "genres"
    | "tags"
  >
): BacklogGame | null {
  const games = getBacklog();
  const index = games.findIndex((g) => g.appId === appId);
  if (index === -1) return null;

  games[index] = {
    ...games[index],
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  saveBacklog(games);
  return games[index];
}

export function updateBacklogNotes(appId: number, notes: string): BacklogGame | null {
  const games = getBacklog();
  const index = games.findIndex((g) => g.appId === appId);
  if (index === -1) return null;

  games[index] = {
    ...games[index],
    notes,
    updatedAt: new Date().toISOString(),
  };
  saveBacklog(games);
  return games[index];
}

export function removeFromBacklog(appId: number): void {
  saveBacklog(getBacklog().filter((g) => g.appId !== appId));
}

export function reorderWishlistQueue(orderedAppIds: number[]): void {
  const games = getBacklog();
  const now = new Date().toISOString();
  const orderMap = new Map(orderedAppIds.map((id, i) => [id, i]));

  const updated = games.map((g) => {
    if (g.status !== "wishlist" || !orderMap.has(g.appId)) return g;
    return { ...g, queueOrder: orderMap.get(g.appId)!, updatedAt: now };
  });

  saveBacklog(updated);
}

export function updateFeaturedArt(appId: number, featuredArt: string | undefined): BacklogGame | null {
  const games = getBacklog();
  const index = games.findIndex((g) => g.appId === appId);
  if (index === -1) return null;

  games[index] = {
    ...games[index],
    featuredArt,
    updatedAt: new Date().toISOString(),
  };
  saveBacklog(games);
  return games[index];
}

export function getBacklogByStatus(status: BacklogStatus): BacklogGame[] {
  return getBacklog().filter((g) => g.status === status);
}

export function sortWishlistQueue(games: BacklogGame[]): BacklogGame[] {
  return [...games].sort((a, b) => {
    const oa = a.queueOrder ?? a.priority ?? Infinity;
    const ob = b.queueOrder ?? b.priority ?? Infinity;
    if (oa !== ob) return oa - ob;
    return a.addedAt.localeCompare(b.addedAt);
  });
}

export function getBacklogStats(): Record<BacklogStatus, number> {
  const games = getBacklog();
  return {
    wishlist: games.filter((g) => g.status === "wishlist").length,
    playing: games.filter((g) => g.status === "playing").length,
    completed: games.filter((g) => g.status === "completed").length,
    dropped: games.filter((g) => g.status === "dropped").length,
  };
}
