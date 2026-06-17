"use client";

import { useEffect, useMemo, useState } from "react";
import type { BacklogGame } from "@/lib/types";
import { updateBacklogMeta } from "@/lib/backlog";
import { hasHltbData } from "@/lib/game-stats";
import { extractSteamGenres } from "@/lib/steam-tags";
import { parseReleaseDate } from "@/lib/release-date";

function needsDetails(game: BacklogGame): boolean {
  return !game.releaseDate || !game.screenshotImage || !game.genres?.length;
}

function needsStats(game: BacklogGame): boolean {
  if (game.metacriticScore === undefined) return true;
  if (!hasHltbData(game)) return true;
  if (game.hltbMainExtraHours == null) return true;
  return false;
}

export function useEnrichedBacklog(games: BacklogGame[]): BacklogGame[] {
  const [enriched, setEnriched] = useState<Record<number, Partial<BacklogGame>>>({});
  const [detailsDone, setDetailsDone] = useState<Set<number>>(new Set());
  const [statsDone, setStatsDone] = useState<Set<number>>(new Set());

  const pending = useMemo(
    () =>
      games.filter(
        (g) =>
          (needsDetails(g) && !detailsDone.has(g.appId)) ||
          (needsStats(g) && !statsDone.has(g.appId))
      ),
    [games, detailsDone, statsDone]
  );

  useEffect(() => {
    if (pending.length === 0) return;

    let cancelled = false;

    async function enrich() {
      for (const game of pending.slice(0, 4)) {
        const tasks: Promise<void>[] = [];

        if (needsDetails(game) && !detailsDone.has(game.appId)) {
          tasks.push(
            fetch(`/api/steam/details?appId=${game.appId}`)
              .then(async (res) => {
                if (cancelled) return;
                if (!res.ok) {
                  setDetailsDone((prev) => new Set(prev).add(game.appId));
                  return;
                }
                const data = await res.json();
                const meta: Partial<BacklogGame> = {};
                if (!game.releaseDate && data.release_date?.date) {
                  meta.releaseDate = data.release_date.date;
                  meta.comingSoon = data.release_date.coming_soon;
                }
                if (!game.backgroundImage) {
                  const bg = data.background_raw || data.background;
                  if (bg) meta.backgroundImage = bg;
                }
                if (!game.screenshotImage) {
                  const shot = data.screenshots?.[0]?.path_full;
                  if (shot) meta.screenshotImage = shot;
                }
                if (!game.genres?.length) {
                  const genres = extractSteamGenres(data.genres);
                  if (genres.length > 0) meta.genres = genres;
                }
                if (Object.keys(meta).length > 0) {
                  setEnriched((prev) => ({
                    ...prev,
                    [game.appId]: { ...prev[game.appId], ...meta },
                  }));
                  updateBacklogMeta(game.appId, meta);
                }
                setDetailsDone((prev) => new Set(prev).add(game.appId));
              })
              .catch(() => {
                if (!cancelled) setDetailsDone((prev) => new Set(prev).add(game.appId));
              })
          );
        }

        if (needsStats(game) && !statsDone.has(game.appId)) {
          tasks.push(
            fetch(`/api/game-stats?appId=${game.appId}&name=${encodeURIComponent(game.name)}`)
              .then(async (res) => {
                if (cancelled) return;
                if (!res.ok) {
                  setStatsDone((prev) => new Set(prev).add(game.appId));
                  return;
                }
                const data = await res.json();
                const meta: Partial<BacklogGame> = {};
                if (game.metacriticScore === undefined && data.metacritic?.score != null) {
                  meta.metacriticScore = data.metacritic.score;
                }
                if (data.hltb) {
                  if (game.hltbMainHours == null && data.hltb.mainHours != null) {
                    meta.hltbMainHours = data.hltb.mainHours;
                  }
                  if (game.hltbMainExtraHours == null && data.hltb.mainExtraHours != null) {
                    meta.hltbMainExtraHours = data.hltb.mainExtraHours;
                  }
                  if (game.hltbCompletionistHours == null && data.hltb.completionistHours != null) {
                    meta.hltbCompletionistHours = data.hltb.completionistHours;
                  }
                }
                if (Object.keys(meta).length > 0) {
                  setEnriched((prev) => ({
                    ...prev,
                    [game.appId]: { ...prev[game.appId], ...meta },
                  }));
                  updateBacklogMeta(game.appId, meta);
                }
                setStatsDone((prev) => new Set(prev).add(game.appId));
              })
              .catch(() => {
                if (!cancelled) setStatsDone((prev) => new Set(prev).add(game.appId));
              })
          );
        }

        await Promise.all(tasks);
      }
    }

    enrich();
    return () => {
      cancelled = true;
    };
  }, [pending, detailsDone, statsDone]);

  return games.map((g) => ({ ...g, ...enriched[g.appId] }));
}

export function getUpcomingGames(games: BacklogGame[]): BacklogGame[] {
  return games
    .map((g) => ({
      game: g,
      parsed: parseReleaseDate(g.releaseDate, g.comingSoon),
    }))
    .filter(({ parsed }) => parsed?.isFuture)
    .sort((a, b) => a.parsed!.sortKey - b.parsed!.sortKey)
    .map(({ game }) => game);
}
