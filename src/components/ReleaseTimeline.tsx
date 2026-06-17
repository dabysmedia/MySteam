"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { BacklogGame } from "@/lib/types";
import { parseReleaseDate, daysUntilRelease, formatCountdown } from "@/lib/release-date";

interface ReleaseTimelineProps {
  games: BacklogGame[];
}

export function ReleaseTimeline({ games }: ReleaseTimelineProps) {
  const upcoming = games
    .map((game) => ({
      game,
      parsed: parseReleaseDate(game.releaseDate, game.comingSoon),
    }))
    .filter(({ parsed }) => parsed?.isFuture)
    .sort((a, b) => a.parsed!.sortKey - b.parsed!.sortKey);

  if (upcoming.length === 0) return null;

  return (
    <section className="px-4 sm:px-0">
      <div className="mb-5">
        <p className="text-eyebrow">On the Horizon</p>
        <h2 className="text-display-md mt-1">Release Timeline</h2>
      </div>

      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute bottom-4 left-[11px] top-4 w-px bg-gradient-to-b from-steam-gold/50 via-steam-gold/20 to-transparent sm:left-[13px]" />

        {upcoming.map(({ game, parsed }, i) => {
          const countdown = formatCountdown(daysUntilRelease(parsed!));
          const art = game.backgroundImage || game.headerImage;

          return (
            <motion.div
              key={game.appId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-5 flex shrink-0 flex-col items-center">
                <div className="h-[22px] w-[22px] rounded-full border-2 border-steam-gold/60 bg-steam-bg shadow-[0_0_12px_rgba(201,169,98,0.3)] sm:h-[26px] sm:w-[26px]" />
              </div>

              <Link
                href={`/game/${game.appId}`}
                className="group flex min-w-0 flex-1 gap-3 overflow-hidden rounded-2xl border border-steam-border bg-steam-card/40 transition-all hover:border-steam-border-gold hover:bg-steam-card/70"
              >
                <div className="relative h-24 w-20 shrink-0 overflow-hidden sm:h-28 sm:w-24">
                  <Image
                    src={art}
                    alt={game.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="96px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center py-3 pr-4">
                  <p className="text-eyebrow text-[0.625rem]">{parsed!.label}</p>
                  <h3 className="truncate font-display text-lg font-medium text-steam-platinum transition-colors group-hover:text-steam-gold-light sm:text-xl">
                    {game.name}
                  </h3>
                  {countdown && (
                    <p className="mt-0.5 text-caption text-steam-gold/80">{countdown}</p>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
