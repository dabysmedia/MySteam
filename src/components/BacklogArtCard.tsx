"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import type { BacklogGame } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { statusBadgeClass } from "@/lib/utils";
import { parseReleaseDate, daysUntilRelease, formatCountdown } from "@/lib/release-date";

interface BacklogArtCardProps {
  game: BacklogGame;
  index?: number;
}

export function BacklogArtCard({ game, index = 0 }: BacklogArtCardProps) {
  const art = game.backgroundImage || game.headerImage;
  const release = parseReleaseDate(game.releaseDate, game.comingSoon);
  const countdown = release?.isFuture ? formatCountdown(daysUntilRelease(release)) : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <Link href={`/game/${game.appId}`} className="group relative block w-full overflow-hidden">
        {/* Art — dominant, full-bleed on mobile */}
        <div className="relative aspect-[3/4] w-full overflow-hidden sm:aspect-[16/10] sm:rounded-2xl sm:border sm:border-steam-border">
          <Image
            src={art}
            alt={game.name}
            fill
            className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
            sizes="100vw"
            priority={index < 2}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

          {/* Status */}
          <span
            className={`absolute right-3 top-3 rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] backdrop-blur-md sm:right-4 sm:top-4 ${statusBadgeClass(game.status)}`}
          >
            {STATUS_LABELS[game.status]}
          </span>

          {/* Release badge */}
          {release?.isFuture && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-steam-border-gold bg-black/50 px-3 py-1 backdrop-blur-md sm:left-4 sm:top-4">
              <Calendar className="h-3 w-3 text-steam-gold" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-steam-gold-light">
                {countdown ?? release.label}
              </span>
            </div>
          )}

          {/* Title overlay — bottom */}
          <div className="absolute inset-x-0 bottom-0 p-4 pb-5 sm:p-6">
            {release?.isFuture && (
              <p className="text-eyebrow mb-1.5 opacity-90">{release.label}</p>
            )}
            <h2 className="text-display-md text-white drop-shadow-lg transition-colors group-hover:text-steam-gold-light">
              {game.name}
            </h2>
            {game.shortDescription && (
              <p className="mt-1.5 line-clamp-2 text-caption text-white/60 sm:max-w-lg">
                {game.shortDescription}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
