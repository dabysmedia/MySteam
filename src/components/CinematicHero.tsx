"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { SteamMovie, SteamScreenshot } from "@/lib/types";
import { SteamVideo } from "@/components/SteamVideo";
import {
  getHighlightTrailer,
  getPlayableTrailers,
  getTrailerSource,
} from "@/lib/steam-video";

interface CinematicHeroProps {
  movies?: SteamMovie[];
  screenshots?: SteamScreenshot[];
  fallbackImage: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  topAction?: React.ReactNode;
}

const SLIDE_INTERVAL = 5000;

export function CinematicHero({
  movies,
  screenshots,
  fallbackImage,
  title,
  subtitle,
  badge,
  children,
  topAction,
}: CinematicHeroProps) {
  const playable = getPlayableTrailers(movies);
  const highlight = getHighlightTrailer(playable);
  const trailerSource = highlight ? getTrailerSource(highlight) : null;
  const hasScreenshots = screenshots && screenshots.length > 0;

  const [trailerIndex, setTrailerIndex] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [mode, setMode] = useState<"trailer" | "slideshow">(
    trailerSource ? "trailer" : "slideshow"
  );

  const currentTrailer = playable[trailerIndex] ?? highlight;
  const currentSource = currentTrailer ? getTrailerSource(currentTrailer) : trailerSource;

  const advanceTrailer = useCallback(() => {
    if (playable.length > 1) {
      setTrailerIndex((i) => (i + 1) % playable.length);
    }
  }, [playable.length]);

  useEffect(() => {
    if (mode !== "slideshow" || !hasScreenshots) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % screenshots!.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [mode, hasScreenshots, screenshots]);

  const showTrailer = mode === "trailer" && currentSource;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black sm:aspect-[21/9] lg:rounded-2xl lg:ring-1 lg:ring-white/10">
      {/* Media layer */}
      {showTrailer ? (
        <SteamVideo
          key={currentTrailer?.id ?? "hero-trailer"}
          source={currentSource}
          poster={currentTrailer?.thumbnail ?? fallbackImage}
          autoPlay
          loop={playable.length <= 1}
          muted
          onEnded={playable.length > 1 ? advanceTrailer : undefined}
          className="absolute inset-0 h-full w-full"
        />
      ) : hasScreenshots ? (
        <div className="absolute inset-0">
          <AnimatePresence mode="sync">
            <motion.div
              key={screenshots![slideIndex].id}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={screenshots![slideIndex].path_full}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <Image
          src={fallbackImage}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      )}

      {/* SteamOS vignette + gradient scrim */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0e12] via-[#0a0e12]/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a0e12]/60 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]" />

      {/* Content overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 lg:p-8">
        {badge}
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-white drop-shadow-lg sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/70 sm:text-base">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
      </div>

      {/* Top action bar (planner CTA, etc.) */}
      {topAction && (
        <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="min-w-0 flex-1">{topAction}</div>
        </div>
      )}

      {/* Mode toggle + progress */}
      <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
        {playable.length > 0 && hasScreenshots && (
          <div className="flex overflow-hidden rounded-full bg-black/50 p-0.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setMode("trailer")}
              className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                mode === "trailer" ? "bg-steam-accent text-[#0a0e12]" : "text-white/70"
              }`}
            >
              Trailer
            </button>
            <button
              type="button"
              onClick={() => setMode("slideshow")}
              className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                mode === "slideshow" ? "bg-steam-accent text-[#0a0e12]" : "text-white/70"
              }`}
            >
              Gallery
            </button>
          </div>
        )}
      </div>

      {/* Slideshow dots */}
      {mode === "slideshow" && hasScreenshots && screenshots!.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 sm:flex-col">
          {screenshots!.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === slideIndex ? "w-6 bg-steam-accent" : "w-1.5 bg-white/40"
              }`}
              aria-label={`Screenshot ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Trailer picker dots */}
      {mode === "trailer" && playable.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {playable.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTrailerIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === trailerIndex ? "w-6 bg-steam-accent" : "w-1.5 bg-white/40"
              }`}
              aria-label={t.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
