"use client";

import type { BacklogGame } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { parseReleaseDate, daysUntilRelease, formatCountdown } from "@/lib/release-date";
import { GameListRow } from "@/components/GameListRow";

interface PlannerGameRowProps {
  game: BacklogGame;
  showRelease?: boolean;
  showCompleted?: boolean;
  index?: number;
}

export function PlannerGameRow({
  game,
  showRelease = false,
  showCompleted = false,
}: PlannerGameRowProps) {
  const release = showRelease ? parseReleaseDate(game.releaseDate, game.comingSoon) : null;
  const countdown = release?.isFuture ? formatCountdown(daysUntilRelease(release)) : null;

  const meta = showCompleted
    ? `Finished ${formatRelativeTime(game.updatedAt)}`
    : showRelease && release
      ? `${release.label}${countdown ? ` · ${countdown}` : ""}`
      : `Added ${formatRelativeTime(game.addedAt)}`;

  return (
    <GameListRow
      game={game}
      meta={
        showRelease && countdown ? (
          <>
            {release?.label}
            <span className="text-steam-accent"> · {countdown}</span>
          </>
        ) : (
          meta
        )
      }
    />
  );
}
