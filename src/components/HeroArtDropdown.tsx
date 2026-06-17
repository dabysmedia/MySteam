"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ImageIcon } from "lucide-react";
import type { BacklogGame } from "@/lib/types";
import type { EnrichedSteamGameDetails } from "@/lib/game-media";
import {
  buildArtOptionsFromBacklog,
  buildArtOptionsFromIgdb,
  buildArtOptionsFromSteam,
  getDefaultArtUrl,
  mergeArtOptions,
} from "@/lib/art-options";
import { cn } from "@/lib/utils";

interface HeroArtDropdownProps {
  game: BacklogGame;
  selectedUrl?: string;
  onSelect: (url: string | undefined) => void;
}

export function HeroArtDropdown({ game, selectedUrl, onSelect }: HeroArtDropdownProps) {
  const [open, setOpen] = useState(false);
  const [steamDetails, setSteamDetails] = useState<EnrichedSteamGameDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/steam/details?appId=${game.appId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EnrichedSteamGameDetails | null) => {
        if (!cancelled && data) setSteamDetails(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [game.appId]);

  const defaultUrl = getDefaultArtUrl(game);

  const options = useMemo(() => {
    const backlog = buildArtOptionsFromBacklog(game);
    const igdb = steamDetails?.igdbMedia ? buildArtOptionsFromIgdb(steamDetails.igdbMedia) : [];
    const steam = steamDetails ? buildArtOptionsFromSteam(steamDetails) : [];
    return mergeArtOptions(igdb, backlog, steam);
  }, [game, steamDetails]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/50 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/65 sm:h-10 sm:w-10"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Choose hero artwork"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute right-0 top-full z-50 mt-2 max-h-[min(20rem,60vh)] w-56 overflow-y-auto rounded-xl border border-steam-border bg-steam-dark/95 shadow-2xl backdrop-blur-xl sm:w-60"
            role="listbox"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="option"
              aria-selected={!selectedUrl}
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 border-b border-steam-border px-3 py-2.5 text-left hover:bg-white/5",
                !selectedUrl && "bg-white/[0.06]"
              )}
            >
              <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                <Image src={defaultUrl} alt="" fill className="object-cover" sizes="64px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-steam-text-bright">Default</span>
                <span className="block text-[10px] text-steam-muted">Header art</span>
              </span>
              {!selectedUrl && <Check className="h-4 w-4 shrink-0 text-steam-accent" />}
            </button>

            {options
              .filter((o) => o.url !== defaultUrl)
              .map((option) => {
                const isActive = selectedUrl === option.url;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSelect(option.url);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-steam-border px-3 py-2.5 text-left last:border-b-0 hover:bg-white/5",
                      isActive && "bg-white/[0.06]"
                    )}
                  >
                    <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                      <Image src={option.url} alt="" fill className="object-cover" sizes="64px" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-steam-text-bright">
                      {option.label}
                    </span>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-steam-accent" />}
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
