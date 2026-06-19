"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DISMISSED_GAMES_CHANGED_EVENT,
  dismissGame,
  getDismissedGames,
  type DismissedGame,
} from "@/lib/dismissed-games";

export function useDismissedGames() {
  const [games, setGames] = useState<DismissedGame[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setGames(getDismissedGames());
  }, []);

  useEffect(() => {
    refresh();
    setHydrated(true);

    const onChanged = () => refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "mysteam-dismissed-games") refresh();
    };

    window.addEventListener(DISMISSED_GAMES_CHANGED_EVENT, onChanged);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(DISMISSED_GAMES_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const dismissedAppIds = useMemo(() => new Set(games.map((game) => game.appId)), [games]);

  const dismiss = useCallback(
    (appId: number, name: string) => {
      dismissGame(appId, name);
      refresh();
    },
    [refresh]
  );

  return { games, dismissedAppIds, dismiss, hydrated };
}
