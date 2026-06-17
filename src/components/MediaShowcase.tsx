"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Maximize2 } from "lucide-react";
import type { SteamMovie, SteamScreenshot } from "@/lib/types";
import { SteamVideo } from "@/components/SteamVideo";
import { getPlayableTrailers, getTrailerSource } from "@/lib/steam-video";

interface MediaShowcaseProps {
  movies?: SteamMovie[];
  screenshots?: SteamScreenshot[];
  gameName: string;
}

export function MediaShowcase({ movies, screenshots, gameName }: MediaShowcaseProps) {
  const playable = getPlayableTrailers(movies);
  const hasScreenshots = screenshots && screenshots.length > 0;

  const [activeTrailer, setActiveTrailer] = useState(0);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [cinemaOpen, setCinemaOpen] = useState(false);

  useEffect(() => {
    if (!hasScreenshots || screenshots!.length <= 1) return;
    const timer = setInterval(() => {
      setActiveScreenshot((i) => (i + 1) % screenshots!.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [hasScreenshots, screenshots]);

  if (playable.length === 0 && !hasScreenshots) return null;

  const currentTrailer = playable[activeTrailer];
  const trailerSource = currentTrailer ? getTrailerSource(currentTrailer) : null;

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header flex items-center justify-between">
        <span>Media</span>
        {hasScreenshots && (
          <span className="text-[10px] normal-case text-steam-muted">
            Auto-slideshow · {screenshots!.length} shots
          </span>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-5">
        {/* Featured trailer player */}
        {playable.length > 0 && (
          <div className="space-y-3 lg:col-span-3">
            <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10">
              {cinemaOpen && trailerSource ? (
                <SteamVideo
                  key={`cinema-${currentTrailer.id}`}
                  source={trailerSource}
                  poster={currentTrailer.thumbnail}
                  autoPlay
                  muted={false}
                  controls
                  loop
                  className="h-full w-full"
                />
              ) : trailerSource ? (
                <SteamVideo
                  key={`inline-${currentTrailer.id}`}
                  source={trailerSource}
                  poster={currentTrailer.thumbnail}
                  autoPlay
                  loop
                  muted
                  className="h-full w-full"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setCinemaOpen(true)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                aria-label="Fullscreen with sound"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-steam-text">{currentTrailer?.name}</p>

            {/* Trailer rail */}
            {playable.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                {playable.map((movie, i) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => {
                      setActiveTrailer(i);
                      setCinemaOpen(false);
                    }}
                    className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                      i === activeTrailer
                        ? "ring-steam-accent"
                        : "ring-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image src={movie.thumbnail} alt={movie.name} fill className="object-cover" sizes="112px" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="h-4 w-4 fill-white text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Auto screenshot showcase */}
        {hasScreenshots && (
          <div className={`space-y-3 ${playable.length > 0 ? "lg:col-span-2" : "lg:col-span-5"}`}>
            <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={screenshots![activeScreenshot].id}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={screenshots![activeScreenshot].path_full}
                    alt={`${gameName} screenshot`}
                    fill
                    className="object-cover"
                    sizes="400px"
                  />
                </motion.div>
              </AnimatePresence>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-xs text-white/80">
                  {activeScreenshot + 1} / {screenshots!.length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {screenshots!.slice(0, 10).map((shot, i) => (
                <button
                  key={shot.id}
                  type="button"
                  onClick={() => setActiveScreenshot(i)}
                  className={`relative aspect-video overflow-hidden rounded-md transition-all ${
                    i === activeScreenshot
                      ? "ring-2 ring-steam-accent"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <Image src={shot.path_thumbnail} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
