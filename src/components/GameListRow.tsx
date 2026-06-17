"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BacklogGame } from "@/lib/types";
import { cn, getRowBleedArt, getRowCoverArt } from "@/lib/utils";

interface GameListRowProps {
  game: BacklogGame;
  meta: React.ReactNode;
  leading?: React.ReactNode;
  hideChevron?: boolean;
  titleClassName?: string;
  coverClassName?: string;
  className?: string;
}

function RowBleedBackground({ src }: { src: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover object-left opacity-50"
        sizes="(max-width: 640px) 100vw, 640px"
        style={{
          maskImage: "linear-gradient(to right, black 8%, black 42%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to right, black 8%, black 42%, transparent 88%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c1118]/92 via-[#0c1118]/55 to-transparent" />
    </div>
  );
}

export function GameListRow({
  game,
  meta,
  leading,
  hideChevron = false,
  titleClassName,
  coverClassName,
  className,
}: GameListRowProps) {
  const cover = getRowCoverArt(game);
  const bleed = getRowBleedArt(game);

  return (
    <div
      className={cn(
        "group flex items-stretch gap-2 border-b border-steam-border last:border-b-0 sm:gap-3",
        className
      )}
    >
      {leading}

      <Link
        href={`/game/${game.appId}`}
        className="relative flex min-w-0 flex-1 overflow-hidden active:opacity-90"
      >
        {bleed && <RowBleedBackground src={bleed} />}

        <div className="relative z-10 flex w-full items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-3">
          <div
            className={cn(
              "relative h-16 w-[96px] shrink-0 overflow-hidden rounded-[11px] ring-1 ring-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.45)] sm:h-14 sm:w-[84px]",
              coverClassName
            )}
          >
            <Image src={cover} alt={game.name} fill className="object-cover" sizes="96px" priority={false} />
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate text-[15px] font-medium text-steam-text-bright group-hover:text-steam-accent sm:text-sm",
                titleClassName
              )}
            >
              {game.name}
            </h3>
            <div className="mt-0.5 truncate text-xs text-steam-muted">{meta}</div>
          </div>

          {!hideChevron && (
            <ChevronRight className="h-4 w-4 shrink-0 text-steam-muted-dark opacity-60 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
          )}
        </div>
      </Link>
    </div>
  );
}
