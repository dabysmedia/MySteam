"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
const HERO_SCRIM_FADE_DELAY_MS = 3500;
const HERO_SCRIM_FADE_DURATION_MS = 2000;
const HERO_TARGET_VOLUME = 0.15;

const TRAILER_THUMB_W = 96;
const TRAILER_THUMB_H = 54;

function TrailerPickerRail({
  trailers,
  activeIndex,
  onSelect,
}: {
  trailers: SteamMovie[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setExpanded(false);
        }
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="flex items-end gap-2 rounded-xl bg-black/75 px-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/15 backdrop-blur-md"
          >
            {trailers.map((trailer, i) => {
              const active = i === activeIndex;
              return (
                <motion.button
                  key={trailer.id}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={trailer.name}
                  aria-current={active}
                  initial={{ opacity: 0, y: 12, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 460,
                    damping: 28,
                    delay: i * 0.04,
                  }}
                  style={{ width: TRAILER_THUMB_W, height: TRAILER_THUMB_H }}
                  className={`relative shrink-0 overflow-hidden rounded-[10px] ${
                    active
                      ? "z-[1] ring-2 ring-steam-accent shadow-[0_0_20px_rgba(26,159,255,0.35)]"
                      : "opacity-80 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={trailer.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={`${TRAILER_THUMB_W}px`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-1.5 pb-1 pt-5">
                    <p className="truncate text-[9px] font-medium leading-tight text-white">
                      {trailer.name}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 py-1"
          >
            {trailers.map((trailer, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={trailer.id}
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-label={trailer.name}
                  aria-current={active}
                  className={`h-1.5 shrink-0 rounded-full transition-all ${
                    active ? "w-6 bg-steam-accent" : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [scrimHidden, setScrimHidden] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroVolume, setHeroVolume] = useState(0);
  const scrimFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRampRef = useRef<number | null>(null);
  const userAudioOverrideRef = useRef(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroMediaRef = useRef<HTMLVideoElement>(null);
  const visibilityPausedRef = useRef(false);
  const wasPlayingBeforeHiddenRef = useRef(false);
  const [heroVisible, setHeroVisible] = useState(true);

  const currentTrailer = playable[trailerIndex] ?? highlight;
  const currentSource = currentTrailer ? getTrailerSource(currentTrailer) : trailerSource;

  const stopVolumeRamp = useCallback(() => {
    if (volumeRampRef.current !== null) {
      cancelAnimationFrame(volumeRampRef.current);
      volumeRampRef.current = null;
    }
  }, []);

  const resetAudio = useCallback(() => {
    stopVolumeRamp();
    userAudioOverrideRef.current = false;
    setHeroVolume(0);
    setHeroMuted(true);
  }, [stopVolumeRamp]);

  const handleHeroVolumeChange = useCallback(
    (volume: number) => {
      userAudioOverrideRef.current = true;
      stopVolumeRamp();
      setHeroVolume(volume);
      setHeroMuted(volume === 0);
    },
    [stopVolumeRamp]
  );

  const handleHeroMutedChange = useCallback(
    (muted: boolean) => {
      userAudioOverrideRef.current = true;
      stopVolumeRamp();
      setHeroMuted(muted);
    },
    [stopVolumeRamp]
  );

  const clearScrimFadeTimer = useCallback(() => {
    if (scrimFadeTimerRef.current) {
      clearTimeout(scrimFadeTimerRef.current);
      scrimFadeTimerRef.current = null;
    }
  }, []);

  const resetScrim = useCallback(() => {
    clearScrimFadeTimer();
    setScrimHidden(false);
    resetAudio();
  }, [clearScrimFadeTimer, resetAudio]);

  const handleTrailerPlayingChange = useCallback(
    (playing: boolean) => {
      if (mode !== "trailer") return;
      if (visibilityPausedRef.current && !playing) return;

      if (playing) {
        if (scrimHidden) return;
        clearScrimFadeTimer();
        scrimFadeTimerRef.current = setTimeout(() => {
          setScrimHidden(true);
        }, HERO_SCRIM_FADE_DELAY_MS);
        return;
      }

      resetScrim();
    },
    [mode, scrimHidden, clearScrimFadeTimer, resetScrim]
  );

  useEffect(() => {
    resetScrim();
  }, [mode, trailerIndex, currentTrailer?.id, resetScrim]);

  useEffect(() => () => clearScrimFadeTimer(), [clearScrimFadeTimer]);

  useEffect(() => {
    if (!scrimHidden || userAudioOverrideRef.current) return;

    setHeroMuted(false);
    const start = performance.now();

    const tick = (now: number) => {
      if (userAudioOverrideRef.current) return;

      const progress = Math.min(1, (now - start) / HERO_SCRIM_FADE_DURATION_MS);
      const eased = 1 - (1 - progress) ** 2;
      setHeroVolume(eased * HERO_TARGET_VOLUME);

      if (progress < 1) {
        volumeRampRef.current = requestAnimationFrame(tick);
      } else {
        volumeRampRef.current = null;
      }
    };

    volumeRampRef.current = requestAnimationFrame(tick);
    return () => stopVolumeRamp();
  }, [scrimHidden, stopVolumeRamp]);

  const advanceTrailer = useCallback(() => {
    if (playable.length > 1) {
      setTrailerIndex((i) => (i + 1) % playable.length);
    }
  }, [playable.length]);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setHeroVisible(visible);

        const video = heroMediaRef.current;
        if (!video || mode !== "trailer") return;

        if (visible) {
          if (visibilityPausedRef.current && wasPlayingBeforeHiddenRef.current) {
            visibilityPausedRef.current = false;
            video.play().catch(() => {});
          }
          return;
        }

        if (!video.paused) {
          wasPlayingBeforeHiddenRef.current = true;
          visibilityPausedRef.current = true;
          video.pause();
        } else {
          wasPlayingBeforeHiddenRef.current = false;
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mode, currentTrailer?.id]);

  useEffect(() => {
    if (mode !== "slideshow" || !hasScreenshots || !heroVisible) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % screenshots!.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [mode, hasScreenshots, screenshots, heroVisible]);

  const showTrailer = mode === "trailer" && currentSource;

  return (
    <div
      ref={heroRef}
      className="relative aspect-[16/9] w-full overflow-hidden bg-black sm:aspect-[21/9] lg:rounded-2xl lg:ring-1 lg:ring-white/10"
    >
      {/* Media layer */}
      {showTrailer ? (
        <SteamVideo
          key={currentTrailer?.id ?? "hero-trailer"}
          source={currentSource}
          poster={currentTrailer?.thumbnail ?? fallbackImage}
          mediaRef={heroMediaRef}
          autoPlay
          cover
          chromeless
          loop={playable.length <= 1}
          muted={heroMuted}
          volume={heroVolume}
          onVolumeChange={handleHeroVolumeChange}
          onMutedChange={handleHeroMutedChange}
          showVolumeSlider
          onEnded={playable.length > 1 ? advanceTrailer : undefined}
          onPlayingChange={handleTrailerPlayingChange}
          className="absolute inset-0 h-full w-full"
        />
      ) : hasScreenshots ? (
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={screenshots![slideIndex].id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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

      {/* SteamOS vignette + gradient scrim — fades while trailer plays */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ opacity: scrimHidden ? 0 : 1 }}
        transition={{ duration: HERO_SCRIM_FADE_DURATION_MS / 1000, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e12] via-[#0a0e12]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0e12]/60 via-transparent to-transparent" />
        <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.5)]" />
      </motion.div>

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

      {/* Trailer picker — dots expand to thumbnails on hover */}
      {mode === "trailer" && playable.length > 1 && (
        <TrailerPickerRail
          trailers={playable}
          activeIndex={trailerIndex}
          onSelect={setTrailerIndex}
        />
      )}
    </div>
  );
}
