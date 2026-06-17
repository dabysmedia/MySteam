"use client";

import Image from "next/image";
import Link from "next/link";
import type { BacklogGame } from "@/lib/types";
import { getGameArt } from "@/lib/utils";
import { formatHltbDisplayTime, getHltbDisplayLabel, hltbBadgeClass, metacriticClass } from "@/lib/game-stats";
import { formatQueueGenres } from "@/lib/steam-tags";
import { HeroArtDropdown } from "@/components/HeroArtDropdown";

interface NowPlayingCardProps {
  game: BacklogGame;
  variant?: "playing" | "next";
  onArtSelect?: (url: string | undefined) => void;
}

export function NowPlayingCard({ game, variant = "playing", onArtSelect }: NowPlayingCardProps) {
  const art = getGameArt(game);
  const isNext = variant === "next";
  const hltbTime = formatHltbDisplayTime(game);
  const hasMc = game.metacriticScore != null;
  const genres = formatQueueGenres(game.genres);
  const hasMeta = hasMc || hltbTime || genres.length > 0;

  return (
    <div
      className="group relative mx-3 sm:mx-0"
    >
      <Link
        href={`/game/${game.appId}`}
        className="relative block overflow-hidden rounded-[var(--radius-steamos-xl)] ring-1 ring-white/10 transition-all active:scale-[0.99] sm:rounded-[var(--radius-steamos-lg)] sm:active:scale-100 hover:ring-steam-accent/25"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset" }}
      >
        <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
          <Image
            src={art}
            alt={game.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            sizes="100vw"
            priority
          />
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0e12]/95 via-[#0a0e12]/35 to-transparent ${
              hasMeta ? "h-[54%] sm:h-[50%]" : "h-[46%] sm:h-[42%]"
            }`}
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/5" />

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
            <span
              className={`steamos-chip mb-2.5 px-3 py-1 text-[10px] sm:mb-2 sm:px-2.5 sm:py-0.5 ${
                isNext ? "steamos-chip-blue" : "steamos-chip-green"
              }`}
            >
              {isNext ? "Next Up" : "Playing Now"}
            </span>
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.75rem]">
              {game.name}
            </h2>
            {hasMeta ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:mt-2 sm:gap-1.5">
                {hasMc && (
                  <span
                    className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-bold sm:text-[10px] ${metacriticClass(game.metacriticScore!)}`}
                  >
                    {game.metacriticScore}
                  </span>
                )}
                {hltbTime && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded border px-2 py-0.5 text-[11px] font-bold sm:text-[10px] ${hltbBadgeClass()}`}
                    title={getHltbDisplayLabel(game)}
                  >
                    <span className="opacity-80">HLTB</span>
                    <span>{hltbTime}</span>
                  </span>
                )}
                {genres.length > 0 && (
                  <span className="text-sm text-white/70 sm:text-xs">
                    {(hasMc || hltbTime) && <span className="mr-1.5 text-white/35">·</span>}
                    {genres.join(" · ")}
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/40">Loading stats…</p>
            )}
          </div>
        </div>
      </Link>

      {onArtSelect && (
        <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
          <HeroArtDropdown
            game={game}
            selectedUrl={game.featuredArt}
            onSelect={onArtSelect}
          />
        </div>
      )}
    </div>
  );
}
