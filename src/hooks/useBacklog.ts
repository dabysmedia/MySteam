"use client";

import { useCallback, useEffect, useState } from "react";
import type { BacklogGame, BacklogStatus } from "@/lib/types";
import {
  addToBacklog,
  getBacklog,
  getBacklogStats,
  isInBacklog,
  removeFromBacklog,
  reorderWishlistQueue,
  updateBacklogNotes,
  updateBacklogStatus,
  updateFeaturedArt,
} from "@/lib/backlog";
import {
  flushRemoteSync,
  pullAndMergeRemote,
  readLocalBacklog,
  syncBacklogOnLoad,
} from "@/lib/backlog-sync";

type AddGameInput = Pick<
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
>;

export function useBacklog() {
  const [games, setGames] = useState<BacklogGame[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [synced, setSynced] = useState(false);

  const refresh = useCallback(() => {
    setGames(getBacklog());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const local = getBacklog();
      if (local.length > 0) {
        setGames(local);
        setHydrated(true);
      }

      const { games: merged, persisted } = await syncBacklogOnLoad();
      if (cancelled) return;

      setGames(merged);
      setSynced(persisted);
      setHydrated(true);
    }

    init();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "mysteam-backlog") refresh();
    };

    const onCustom = () => refresh();

    const onSyncIdChanged = async () => {
      const { games: merged, persisted } = await pullAndMergeRemote();
      setGames(merged);
      setSynced(persisted);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("mysteam-backlog-changed", onCustom);
    window.addEventListener("mysteam-sync-id-changed", onSyncIdChanged);

    const onBeforeUnload = () => {
      flushRemoteSync(readLocalBacklog());
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushRemoteSync(readLocalBacklog());
      }
    });

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("mysteam-backlog-changed", onCustom);
      window.removeEventListener("mysteam-sync-id-changed", onSyncIdChanged);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [refresh]);

  const add = useCallback(
    (game: AddGameInput, status: BacklogStatus = "wishlist") => {
      addToBacklog(game, status);
      refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    (appId: number) => {
      removeFromBacklog(appId);
      refresh();
    },
    [refresh]
  );

  const setStatus = useCallback(
    (appId: number, status: BacklogStatus) => {
      updateBacklogStatus(appId, status);
      refresh();
    },
    [refresh]
  );

  const setNotes = useCallback(
    (appId: number, notes: string) => {
      updateBacklogNotes(appId, notes);
      refresh();
    },
    [refresh]
  );

  const reorderQueue = useCallback(
    (orderedAppIds: number[]) => {
      reorderWishlistQueue(orderedAppIds);
      refresh();
    },
    [refresh]
  );

  const setFeaturedArt = useCallback(
    (appId: number, art: string | undefined) => {
      updateFeaturedArt(appId, art);
      refresh();
    },
    [refresh]
  );

  const check = useCallback((appId: number) => isInBacklog(appId), []);

  return {
    games,
    hydrated,
    synced,
    stats: getBacklogStats(),
    add,
    remove,
    setStatus,
    setNotes,
    reorderQueue,
    setFeaturedArt,
    isInBacklog: check,
    refresh,
  };
}
