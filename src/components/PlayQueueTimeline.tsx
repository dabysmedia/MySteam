"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ChevronDown, GripVertical } from "lucide-react";
import type { BacklogGame } from "@/lib/types";
import { sortWishlistQueue } from "@/lib/backlog";
import { mergeVisibleQueueOrder } from "@/lib/queue-order";
import { formatHltbDisplayTime, getHltbDisplayLabel, hltbBadgeClass, metacriticClass } from "@/lib/game-stats";
import { formatQueueGenres } from "@/lib/steam-tags";
import { parseReleaseDate, daysUntilRelease, formatCountdown } from "@/lib/release-date";
import { GameListRow } from "@/components/GameListRow";
import { cn } from "@/lib/utils";

interface PlayQueueTimelineProps {
  queue: BacklogGame[];
  upcoming: BacklogGame[];
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

function UpNextSlot({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-2 my-2 overflow-hidden rounded-[var(--radius-steamos-lg)]",
        "border border-steam-accent/30 ring-1 ring-steam-accent/25",
        "bg-gradient-to-br from-steam-accent/[0.16] via-steam-accent/[0.06] to-[#0c1118]/80",
        "shadow-[inset_0_1px_0_rgba(26,159,255,0.15),0_8px_28px_rgba(26,159,255,0.1)]",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-steam-accent via-steam-accent/80 to-steam-accent/40" />
      {children}
    </div>
  );
}

function QueueListRow({
  game,
  isNextUp,
  skipSlot,
  className,
}: {
  game: BacklogGame;
  isNextUp: boolean;
  skipSlot?: boolean;
  className?: string;
}) {
  const row = (
    <GameListRow
      game={game}
      meta={<QueueMeta game={game} />}
      titleClassName={isNextUp ? "text-white lg:text-base" : undefined}
      coverClassName={
        isNextUp ? "ring-2 ring-steam-accent/70 shadow-[0_0_28px_rgba(26,159,255,0.35)]" : undefined
      }
      linkClassName={isNextUp ? "py-1" : undefined}
      className={cn(isNextUp ? "border-b-0" : undefined, className)}
    />
  );

  if (!isNextUp || skipSlot) return row;

  return <UpNextSlot>{row}</UpNextSlot>;
}

function DraggableQueueRow({
  game,
  isNextUp,
  onDragStart,
  onDragEnd,
}: {
  game: BacklogGame;
  isNextUp: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();

  const rowBody = (
    <div className="flex items-stretch">
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        className={cn(
          "flex w-10 shrink-0 cursor-grab touch-none items-center justify-center transition-colors hover:text-steam-accent active:cursor-grabbing sm:w-11",
          isNextUp ? "text-steam-accent/70" : "text-steam-muted"
        )}
        aria-label={`Reorder ${game.name}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <QueueListRow game={game} isNextUp={isNextUp} skipSlot className="border-b-0" />
      </div>
    </div>
  );

  return (
    <Reorder.Item
      value={game}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "relative z-0 last:border-b-0",
        isNextUp ? "border-b-0 bg-transparent" : "border-b border-steam-border bg-steam-dark"
      )}
      whileDrag={{
        zIndex: 50,
        scale: 1.02,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
      }}
      transition={{ duration: 0.15 }}
    >
      {isNextUp ? <UpNextSlot>{rowBody}</UpNextSlot> : rowBody}
    </Reorder.Item>
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

export function PlayQueueTimeline({
  queue,
  upcoming,
  onReorder,
}: PlayQueueTimelineProps) {
  const sortedQueue = sortWishlistQueue(queue);
  const visibleQueue = sortedQueue;
  const firstInQueueId = sortedQueue[0]?.appId;
  const isEmpty = visibleQueue.length === 0 && upcoming.length === 0;
  const canReorder = Boolean(onReorder) && visibleQueue.length > 1;
  const [reordering, setReordering] = useState(false);
  const [upcomingOpen, setUpcomingOpen] = useState(upcoming.length > 0);
  const orderKey = visibleQueue.map((g) => g.appId).join(",");
  const [orderedVisible, setOrderedVisible] = useState(visibleQueue);
  const draggingRef = useRef(false);
  const orderedRef = useRef(visibleQueue);
  const lastSyncedKeyRef = useRef(orderKey);

  const displayQueue = useMemo(() => {
    const byId = new Map(visibleQueue.map((g) => [g.appId, g]));
    return orderedVisible.map((g) => byId.get(g.appId) ?? g);
  }, [orderedVisible, visibleQueue]);

  useEffect(() => {
    if (draggingRef.current || lastSyncedKeyRef.current === orderKey) return;
    lastSyncedKeyRef.current = orderKey;
    setOrderedVisible(visibleQueue);
    orderedRef.current = visibleQueue;
  }, [orderKey, visibleQueue]);

  function commitOrder(nextVisible: BacklogGame[]) {
    if (!onReorder) return;
    onReorder(mergeVisibleQueueOrder(sortedQueue, nextVisible));
  }

  function handleReorder(nextVisible: BacklogGame[]) {
    setOrderedVisible(nextVisible);
    orderedRef.current = nextVisible;
  }

  function handleDragStart() {
    draggingRef.current = true;
  }

  function handleDragEnd() {
    draggingRef.current = false;
    commitOrder(orderedRef.current);
  }

  function toggleReordering() {
    setReordering((active) => {
      if (active) {
        draggingRef.current = false;
        return false;
      }
      setOrderedVisible(visibleQueue);
      orderedRef.current = visibleQueue;
      return true;
    });
  }

  function isNextUpGame(game: BacklogGame): boolean {
    return firstInQueueId !== undefined && game.appId === firstInQueueId;
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
            onClick={toggleReordering}
            className={`shrink-0 text-xs font-medium transition-colors ${
              reordering ? "text-steam-accent" : "text-steam-link hover:text-steam-accent-hover"
            }`}
          >
            {reordering ? "Done" : "Reorder"}
          </button>
        )}
      </div>

      {visibleQueue.length > 0 && (
        reordering && canReorder ? (
          <Reorder.Group
            axis="y"
            values={displayQueue}
            onReorder={handleReorder}
          >
            {displayQueue.map((game) => (
              <DraggableQueueRow
                key={game.appId}
                game={game}
                isNextUp={isNextUpGame(game)}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            ))}
          </Reorder.Group>
        ) : (
          <div>
            {displayQueue.map((game) => (
              <QueueListRow key={game.appId} game={game} isNextUp={isNextUpGame(game)} />
            ))}
          </div>
        )
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
