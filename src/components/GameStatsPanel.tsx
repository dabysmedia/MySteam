"use client";

import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import type { GameStats } from "@/lib/types";
import { formatPlaytimeHours, metacriticClass } from "@/lib/game-stats";

interface GameStatsPanelProps {
  stats: GameStats | null;
  loading?: boolean;
}

function MetacriticBadge({ score, url }: { score: number; url?: string }) {
  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${metacriticClass(score)}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">MC</span>
      {score}
    </span>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
        {badge}
      </a>
    );
  }
  return badge;
}

function TimeStat({ label, hours }: { label: string; hours: number | null }) {
  const formatted = formatPlaytimeHours(hours);
  if (!formatted) return null;

  return (
    <div className="rounded-xl border border-steam-border bg-steam-surface/50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-steam-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-steam-text-bright">{formatted}</p>
    </div>
  );
}

export function GameStatsPanel({ stats, loading }: GameStatsPanelProps) {
  if (loading) {
    return (
      <section className="steamos-panel overflow-hidden">
        <div className="steamos-section-header">Scores &amp; Playtime</div>
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 skeleton rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!stats?.metacritic && !stats?.hltb) return null;

  const hasTimes =
    stats.hltb?.mainHours || stats.hltb?.mainExtraHours || stats.hltb?.completionistHours;

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header flex items-center justify-between">
        <span>Scores &amp; Playtime</span>
        {stats.hltb?.hltbUrl && (
          <a
            href={stats.hltb.hltbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-medium normal-case text-steam-link hover:text-steam-accent-hover"
          >
            HLTB
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {stats.metacritic && (
          <div className="flex items-center gap-3">
            <MetacriticBadge score={stats.metacritic.score} url={stats.metacritic.url} />
            <span className="text-sm text-steam-muted">Metacritic score</span>
          </div>
        )}

        {hasTimes && (
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-steam-muted">
              <Clock className="h-3.5 w-3.5 text-steam-accent" />
              How Long To Beat
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <TimeStat label="Main Story" hours={stats.hltb?.mainHours ?? null} />
              <TimeStat label="Main + Extra" hours={stats.hltb?.mainExtraHours ?? null} />
              <TimeStat label="Completionist" hours={stats.hltb?.completionistHours ?? null} />
            </div>
          </div>
        )}

        {stats.hltb?.hltbUrl && (
          <Link
            href={stats.hltb.hltbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-steam-muted transition-colors hover:text-steam-link"
          >
            View on HowLongToBeat
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </section>
  );
}

export function GameStatsCompact({ stats }: { stats: GameStats | null }) {
  if (!stats?.metacritic && !stats?.hltb?.mainHours) return null;

  const parts: string[] = [];
  if (stats.metacritic) parts.push(`MC ${stats.metacritic.score}`);
  if (stats.hltb?.mainHours) {
    const h = formatPlaytimeHours(stats.hltb.mainHours);
    if (h) parts.push(h);
  }

  return (
    <span className="text-steam-muted-dark">
      <span className="mx-1.5">·</span>
      {parts.join(" · ")}
    </span>
  );
}
