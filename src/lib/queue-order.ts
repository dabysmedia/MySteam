import type { BacklogGame } from "./types";

/** Apply a new visible-queue order onto the full wishlist sort order. */
export function mergeVisibleQueueOrder(
  sortedQueue: BacklogGame[],
  visibleOrder: BacklogGame[]
): number[] {
  const visibleIds = visibleOrder.map((g) => g.appId);
  const visibleSet = new Set(visibleIds);
  let visibleIndex = 0;

  return sortedQueue.map((game) =>
    visibleSet.has(game.appId) ? visibleIds[visibleIndex++]! : game.appId
  );
}
