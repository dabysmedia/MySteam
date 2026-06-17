"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { BacklogGame } from "@/lib/types";
import { sortWishlistQueue } from "@/lib/backlog";
import { formatHltbDisplayTime, getHltbDisplayLabel, hltbBadgeClass, metacriticClass } from "@/lib/game-stats";
import { formatQueueGenres } from "@/lib/steam-tags";
import { parseReleaseDate, daysUntilRelease, formatCountdown } from "@/lib/release-date";
import { GameListRow } from "@/components/GameListRow";

interface PlayQueueTimelineProps {
  queue: BacklogGame[];
  upcoming: BacklogGame[];
  heroAppId?: number;
  onReorder?: (orderedAppIds: number[]) => void;
}

function QueueMeta({ game }: { game: BacklogGame }) {
  const hltbTime = formatHltbDisplayTime(game);
  const hasMc = game.metacriticScore != null;
  const labels = formatQueueGenres(game.genres);

  if (!hasMc && !hltbTime && labels.length === 0) {
    return <span className="text-steam-muted-dark">Loading stats…</span>;
  }

  return (
    <>
      {hasMc && (
        <span
          className={`inline-flex rounded border px-1.5 py-px text-[9px] font-bold ${metacriticClass(game.metacriticScore!)}`}
        >
          {game.metacriticScore}
        </span>
      )}
      {hltbTime && (
        <>
          {hasMc && <span className="text-steam-muted-dark"> · </span>}
          <span
            className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-px text-[9px] font-bold ${hltbBadgeClass()}`}
            title={getHltbDisplayLabel(game)}
          >
            <span className="opacity-80">HLTB</span>
            <span>{hltbTime}</span>
          </span>
        </>
      )}
      {labels.length > 0 && (
        <>
          {(hasMc || hltbTime) && <span className="text-steam-muted-dark"> · </span>}
          <span className="text-steam-muted">{labels.join(" · ")}</span>
        </>
      )}
    </>
  );
}

function QueueRow({
  game,
  reordering,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  game: BacklogGame;
  reordering: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const leading = reordering ? (
    <div className="flex shrink-0 flex-col justify-center gap-0.5 self-center pl-4 sm:pl-5">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp}
        aria-label="Move up"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-steam-muted transition-colors hover:bg-white/10 hover:text-steam-accent disabled:opacity-25"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown}
        aria-label="Move down"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-steam-muted transition-colors hover:bg-white/10 hover:text-steam-accent disabled:opacity-25"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  ) : undefined;

  return (
    <GameListRow
      game={game}
      meta={<QueueMeta game={game} />}
      leading={leading}
      hideChevron={reordering}
    />
  );
}

function UpcomingRow({ game }: { game: BacklogGame }) {
  const parsed = parseReleaseDate(game.releaseDate, game.comingSoon);
  const countdown = parsed?.isFuture ? formatCountdown(daysUntilRelease(parsed)) : null;

  return (
    <GameListRow
      game={game}
      titleClassName="group-hover:text-steam-gold-light"
      coverClassName="ring-steam-gold/25"
      meta={
        <span className="text-steam-gold/90">
          {parsed?.label}
          {countdown && <span className="text-steam-muted"> · {countdown}</span>}
        </span>
      }
    />
  );
}

export function PlayQueueTimeline({ queue, upcoming, heroAppId, onReorder }: PlayQueueTimelineProps) {
  const sortedQueue = sortWishlistQueue(queue);
  const visibleQueue = heroAppId
    ? sortedQueue.filter((g) => g.appId !== heroAppId)
    : sortedQueue;
  const isEmpty = visibleQueue.length === 0 && upcoming.length === 0;
  const canReorder = Boolean(onReorder) && sortedQueue.length > 1;
  const [reordering, setReordering] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(upcoming.length > 0);

  function moveQueueItem(visibleIndex: number, direction: -1 | 1) {
    if (!onReorder) return;
    const target = visibleQueue[visibleIndex];
    const fullIndex = sortedQueue.findIndex((g) => g.appId === target.appId);
    const nextIndex = fullIndex + direction;
    if (nextIndex < 0 || nextIndex >= sortedQueue.length) return;
    const ids = sortedQueue.map((g) => g.appId);
    [ids[fullIndex], ids[nextIndex]] = [ids[nextIndex], ids[fullIndex]];
    onReorder(ids);
  }

  if (isEmpty) {
    return (
      <section className="steamos-panel w-full max-w-full overflow-hidden">
        <div className="steamos-section-header">To Play</div>
        <div className="px-5 py-8 sm:px-6 sm:py-6">
          <p className="text-sm font-medium text-steam-text">Your queue is empty</p>
          <p className="mt-1 text-xs text-steam-muted">Search Steam to add games you want to play.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="steamos-panel w-full max-w-full overflow-hidden">
      <div className="steamos-section-header flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span>To Play</span>
          <span className="steamos-chip steamos-chip-muted px-2 py-0.5 text-[10px]">
            {visibleQueue.length + upcoming.length}
          </span>
        </div>
        {canReorder && visibleQueue.length > 0 && (
          <button
            type="button"
            onClick={() => setReordering((v) => !v)}
            className={`shrink-0 text-xs font-medium transition-colors ${
              reordering ? "text-steam-accent" : "text-steam-link hover:text-steam-accent-hover"
            }`}
          >
            {reordering ? "Done" : "Reorder"}
          </button>
        )}
      </div>

      {visibleQueue.length > 0 && (
        <div>
          {visibleQueue.map((game, i) => (
            <QueueRow
              key={game.appId}
              game={game}
              reordering={reordering}
              canMoveUp={sortedQueue.findIndex((g) => g.appId === game.appId) > 0}
              canMoveDown={
                sortedQueue.findIndex((g) => g.appId === game.appId) < sortedQueue.length - 1
              }
              onMoveUp={() => moveQueueItem(i, -1)}
              onMoveDown={() => moveQueueItem(i, 1)}
            />
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="border-t border-steam-border">
          <button
            type="button"
            onClick={() => setUpcomingOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-steam-gold-light sm:text-[10px] sm:font-medium">
                Coming Soon
              </span>
              <span className="steamos-chip steamos-chip-gold px-2 py-0.5 text-[10px]">
                {upcoming.length}
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-steam-muted transition-transform ${upcomingOpen ? "rotate-180" : ""}`}
            />
          </button>
          {upcomingOpen && (
            <div className="border-t border-steam-border/50">
              {upcoming.map((game) => (
                <UpcomingRow key={game.appId} game={game} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
