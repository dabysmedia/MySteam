"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Apple,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { CinematicHero } from "@/components/CinematicHero";
import { MediaShowcase } from "@/components/MediaShowcase";
import { PlannerActions } from "@/components/PlannerActions";
import { GamePlannerBar } from "@/components/GamePlannerBar";
import { GameStatsPanel } from "@/components/GameStatsPanel";
import { useBacklog } from "@/hooks/useBacklog";
import type { SteamGameDetails, BacklogStatus, GameStats } from "@/lib/types";
import { extractSteamGenres } from "@/lib/steam-tags";
import { formatPlaytimeHours } from "@/lib/game-stats";

export default function GameDetailPage() {
  const params = useParams();
  const appId = Number(params.id);
  const [game, setGame] = useState<SteamGameDetails | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { games, add, remove, setStatus, isInBacklog } = useBacklog();

  const planEntry = games.find((g) => g.appId === appId);
  const inPlan = isInBacklog(appId);

  useEffect(() => {
    if (!appId || isNaN(appId)) {
      setError("Invalid game ID");
      setLoading(false);
      return;
    }

    async function fetchGame() {
      try {
        const res = await fetch(`/api/steam/details?appId=${appId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setGame(data);

        setStatsLoading(true);
        const statsRes = await fetch(
          `/api/game-stats?appId=${appId}&name=${encodeURIComponent(data.name)}`
        );
        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
      } catch {
        setError("Could not load game details");
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    }

    fetchGame();
  }, [appId]);

  if (loading) {
    return (
      <div className="space-y-0">
        <div className="aspect-[16/9] skeleton sm:aspect-[21/9]" />
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6 lg:max-w-none lg:px-0">
          <div className="h-8 w-2/3 skeleton rounded-lg" />
          <div className="h-48 skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-steam-muted">{error ?? "Game not found"}</p>
        <Link href="/search" className="text-sm text-steam-link hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  const bgImage =
    planEntry?.featuredArt ||
    game.header_image ||
    game.background_raw ||
    game.background ||
    game.header_image;
  const isComingSoon = game.release_date?.coming_soon;

  const handleAdd = (status: BacklogStatus) =>
    add(
      {
        appId: game.steam_appid,
        name: game.name,
        headerImage: game.header_image,
        backgroundImage: game.background_raw || game.background,
        screenshotImage: game.screenshots?.[0]?.path_full,
        shortDescription: game.short_description,
        releaseDate: game.release_date?.date,
        comingSoon: game.release_date?.coming_soon,
        genres: extractSteamGenres(game.genres),
      },
      status
    );

  return (
    <div className="overflow-x-hidden pb-8">
      <div className="full-bleed mb-6 lg:px-0">
        <CinematicHero
          movies={game.movies}
          screenshots={game.screenshots}
          fallbackImage={bgImage}
          title={game.name}
          subtitle={game.short_description}
          topAction={
            <GamePlannerBar
              inPlan={inPlan}
              currentStatus={planEntry?.status}
              onAdd={handleAdd}
              onStatusChange={(status) => setStatus(appId, status)}
            />
          }
          badge={
            isComingSoon ? (
              <span className="inline-block rounded-full bg-steam-accent/20 px-3 py-1 text-xs font-medium text-steam-accent">
                {game.release_date?.date ?? "Coming Soon"}
              </span>
            ) : stats?.metacritic ? (
              <span className="inline-block rounded-full bg-[#59b200]/20 px-3 py-1 text-xs font-medium text-[#59b200]">
                Metacritic {stats.metacritic.score}
              </span>
            ) : game.metacritic ? (
              <span className="inline-block rounded-full bg-[#59b200]/20 px-3 py-1 text-xs font-medium text-[#59b200]">
                Metacritic {game.metacritic.score}
              </span>
            ) : null
          }
        />
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:max-w-none lg:space-y-6 lg:px-0">
        <nav className="flex items-center gap-1.5 text-xs text-steam-muted">
          <Link href="/" className="hover:text-steam-link">Planner</Link>
          <span>/</span>
          <Link href="/search" className="hover:text-steam-link">Browse</Link>
          <span>/</span>
          <span className="truncate text-steam-text">{game.name}</span>
        </nav>

        <GameStatsPanel stats={stats} loading={statsLoading} />

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1 space-y-5 lg:space-y-6">
            <MediaShowcase
              movies={game.movies}
              screenshots={game.screenshots}
              gameName={game.name}
            />

            <div className="steamos-panel overflow-hidden">
              <div className="steamos-section-header">About This Game</div>
              <div className="p-4 sm:p-5">
                <p className="mb-4 text-sm leading-relaxed text-steam-text sm:text-base">
                  {game.short_description}
                </p>
                <div
                  className="steam-prose"
                  dangerouslySetInnerHTML={{
                    __html: game.about_the_game || game.detailed_description,
                  }}
                />
              </div>
            </div>
          </div>

          <aside className="w-full shrink-0 space-y-4 lg:w-80 lg:space-y-5 xl:w-[22rem]">
            <div className="steamos-panel steamos-glow p-4">
              <div className="mb-4 border-b border-steam-border pb-4">
                {game.price_overview ? (
                  <div className="flex flex-wrap items-baseline gap-2">
                    {game.price_overview.discount_percent > 0 && (
                      <span className="rounded-md bg-[#59b200] px-2 py-0.5 text-sm font-medium text-white">
                        -{game.price_overview.discount_percent}%
                      </span>
                    )}
                    <span className="text-2xl font-medium text-steam-text-bright">
                      {game.price_overview.final_formatted}
                    </span>
                    {game.price_overview.discount_percent > 0 && (
                      <span className="text-sm text-steam-muted line-through">
                        {game.price_overview.initial_formatted}
                      </span>
                    )}
                  </div>
                ) : game.is_free ? (
                  <span className="text-lg font-medium text-steam-text-bright">Free to Play</span>
                ) : isComingSoon ? (
                  <span className="text-sm text-steam-accent">Coming Soon</span>
                ) : null}
              </div>

              <PlannerActions
                inPlan={inPlan}
                currentStatus={planEntry?.status}
                onAdd={handleAdd}
                onRemove={() => remove(appId)}
                onStatusChange={(status) => setStatus(appId, status)}
              />
            </div>

            <div className="steamos-panel overflow-hidden">
              <div className="steamos-section-header">Details</div>
              <dl className="text-sm">
                {game.release_date && (
                  <MetaRow label="Release" value={game.release_date.date} />
                )}
                {game.developers && (
                  <MetaRow label="Developer" value={game.developers.join(", ")} />
                )}
                {game.publishers && (
                  <MetaRow label="Publisher" value={game.publishers.join(", ")} />
                )}
                {(stats?.metacritic ?? game.metacritic) && (
                  <MetaRow
                    label="Metacritic"
                    value={String((stats?.metacritic ?? game.metacritic)!.score)}
                  />
                )}
                {stats?.hltb?.mainHours != null && (
                  <MetaRow
                    label="Main Story"
                    value={formatPlaytimeHours(stats.hltb.mainHours) ?? "—"}
                  />
                )}
                {game.recommendations && (
                  <MetaRow
                    label="Reviews"
                    value={`${(game.recommendations.total / 1000).toFixed(0)}k+`}
                  />
                )}
              </dl>
            </div>

            {game.genres && (
              <div className="steamos-panel overflow-hidden">
                <div className="steamos-section-header">Genres</div>
                <div className="flex flex-wrap gap-2 p-3">
                  {game.genres.map((g) => (
                    <span
                      key={g.id}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-steam-text"
                    >
                      {g.description}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {game.platforms && (
              <div className="flex items-center gap-3 px-1 text-steam-muted">
                {game.platforms.windows && <Monitor className="h-4 w-4" />}
                {game.platforms.mac && <Apple className="h-4 w-4" />}
                {game.platforms.linux && <Terminal className="h-4 w-4" />}
              </div>
            )}

            <a
              href={`https://store.steampowered.com/app/${game.steam_appid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 text-xs text-steam-link hover:underline"
            >
              View on Steam Store
              <ExternalLink className="h-3 w-3" />
            </a>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-steam-border px-4 py-2.5 last:border-b-0">
      <dt className="shrink-0 text-steam-muted">{label}</dt>
      <dd className="text-right text-steam-text">{value}</dd>
    </div>
  );
}
