import type { BacklogGame } from "./types";

export function mergeBacklogs(local: BacklogGame[], remote: BacklogGame[]): BacklogGame[] {
  const map = new Map<number, BacklogGame>();

  for (const game of [...remote, ...local]) {
    const existing = map.get(game.appId);
    if (!existing || game.updatedAt > existing.updatedAt) {
      map.set(game.appId, game);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );
}
