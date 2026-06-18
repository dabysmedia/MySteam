"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Maximize2, Minimize2, ChevronLeft, ChevronRight, X, Expand } from "lucide-react";
import type { SteamMovie, SteamScreenshot } from "@/lib/types";
import { SteamVideo } from "@/components/SteamVideo";
import { getPlayableTrailers, getTrailerSource } from "@/lib/steam-video";

const TRAILER_THUMB_HEIGHT = 129;
const TRAILER_THUMB_WIDTH = Math.round((TRAILER_THUMB_HEIGHT * 16) / 9);
/** Vertical gap between preview and thumb strip (`space-y-3`). */
const COLUMN_INNER_GAP = 12;

function getFullscreenElement(): Element | null {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestElementFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  const webkit = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  if (webkit.webkitRequestFullscreen) {
    await webkit.webkitRequestFullscreen();
  }
}

async function exitDocumentFullscreen() {
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
  }
}

interface MediaShowcaseProps {
  movies?: SteamMovie[];
  screenshots?: SteamScreenshot[];
  gameName: string;
}

export function MediaShowcase({ movies, screenshots, gameName }: MediaShowcaseProps) {
  const playable = useMemo(() => getPlayableTrailers(movies), [movies]);
  const hasScreenshots = screenshots && screenshots.length > 0;

  const [activeTrailer, setActiveTrailer] = useState(0);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [cinemaOpen, setCinemaOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [slideshowPaused, setSlideshowPaused] = useState(false);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trailerThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const trailerColRef = useRef<HTMLDivElement>(null);
  const trailerVideoRef = useRef<HTMLDivElement>(null);
  const trailerMediaRef = useRef<HTMLVideoElement>(null);
  const trailerRailRef = useRef<HTMLDivElement>(null);
  const wasTrailerFullscreenRef = useRef(false);
  const screenshotPreviewRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const skipScreenshotScrollRef = useRef(true);
  const skipTrailerScrollRef = useRef(true);
  const [thumbStripHeight, setThumbStripHeight] = useState<number | undefined>(undefined);

  const currentTrailer = playable[activeTrailer];
  const trailerSource = useMemo(
    () => (currentTrailer ? getTrailerSource(currentTrailer) : null),
    [currentTrailer]
  );

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    setSlideshowPaused(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSlideshowPaused(false);
  }, []);

  const isTrailerFullscreen = useCallback(
    () => getFullscreenElement() === trailerVideoRef.current,
    []
  );

  const exitCinema = useCallback(async () => {
    const video = trailerMediaRef.current;
    if (video) video.muted = true;
    setCinemaOpen(false);
    if (isTrailerFullscreen()) {
      try {
        await exitDocumentFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, [isTrailerFullscreen]);

  const toggleCinema = useCallback(async () => {
    const container = trailerVideoRef.current;
    const video = trailerMediaRef.current;
    if (!container) return;

    if (cinemaOpen || isTrailerFullscreen()) {
      await exitCinema();
      return;
    }

    if (video) video.muted = false;
    setCinemaOpen(true);
    try {
      await requestElementFullscreen(container);
    } catch {
      /* Fullscreen unavailable — keep cinema mode with sound and controls */
    }
  }, [cinemaOpen, exitCinema, isTrailerFullscreen]);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = isTrailerFullscreen();
      const video = trailerMediaRef.current;

      if (active) {
        wasTrailerFullscreenRef.current = true;
        setCinemaOpen(true);
        if (video) video.muted = false;
        return;
      }

      if (wasTrailerFullscreenRef.current) {
        wasTrailerFullscreenRef.current = false;
        setCinemaOpen(false);
        if (video) video.muted = true;
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, [isTrailerFullscreen]);

  const goToPrevTrailer = useCallback(() => {
    setActiveTrailer((i) => (i - 1 + playable.length) % playable.length);
    void exitCinema();
  }, [playable.length, exitCinema]);

  const goToNextTrailer = useCallback(() => {
    setActiveTrailer((i) => (i + 1) % playable.length);
    void exitCinema();
  }, [playable.length, exitCinema]);

  const goToPrevScreenshot = useCallback(() => {
    if (!screenshots?.length) return;
    setLightboxIndex((i) => (i - 1 + screenshots.length) % screenshots.length);
  }, [screenshots]);

  const goToNextScreenshot = useCallback(() => {
    if (!screenshots?.length) return;
    setLightboxIndex((i) => (i + 1) % screenshots.length);
  }, [screenshots]);

  useEffect(() => {
    if (!hasScreenshots || screenshots!.length <= 1 || slideshowPaused || lightboxOpen || !sectionVisible) {
      return;
    }
    const timer = setInterval(() => {
      setActiveScreenshot((i) => (i + 1) % screenshots!.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [hasScreenshots, screenshots, slideshowPaused, lightboxOpen, sectionVisible]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevScreenshot();
      if (e.key === "ArrowRight") goToNextScreenshot();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrevScreenshot, goToNextScreenshot]);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (skipScreenshotScrollRef.current) {
      skipScreenshotScrollRef.current = false;
      return;
    }
    if (!sectionVisible) return;

    thumbRefs.current[activeScreenshot]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeScreenshot, sectionVisible]);

  useEffect(() => {
    if (skipTrailerScrollRef.current) {
      skipTrailerScrollRef.current = false;
      return;
    }
    if (!sectionVisible) return;

    trailerThumbRefs.current[activeTrailer]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [activeTrailer, sectionVisible]);

  const hasTrailers = playable.length > 0;
  const sideBySide = hasTrailers && hasScreenshots;

  useEffect(() => {
    if (!sideBySide) {
      setThumbStripHeight(undefined);
      return;
    }

    const update = () => {
      if (window.innerWidth < 1024) {
        setThumbStripHeight(undefined);
        return;
      }

      const trailerRail = trailerRailRef.current;
      const preview = screenshotPreviewRef.current;
      const trailerCol = trailerColRef.current;
      if (!preview || !trailerCol) return;

      const targetBottom = trailerRail
        ? trailerRail.getBoundingClientRect().bottom
        : trailerCol.getBoundingClientRect().bottom;
      const previewBottom = preview.getBoundingClientRect().bottom;
      const height = Math.ceil(targetBottom - previewBottom - COLUMN_INNER_GAP);

      setThumbStripHeight(Math.max(64, height));
    };

    update();
    const observer = new ResizeObserver(update);
    if (trailerColRef.current) observer.observe(trailerColRef.current);
    if (trailerRailRef.current) observer.observe(trailerRailRef.current);
    if (screenshotPreviewRef.current) observer.observe(screenshotPreviewRef.current);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [sideBySide, playable.length, activeTrailer, cinemaOpen]);

  if (!hasTrailers && !hasScreenshots) return null;

  return (
    <>
      <section ref={sectionRef} className="steamos-panel overflow-hidden">
        <div className="steamos-section-header flex items-center justify-between">
          <span>Media</span>
          {hasScreenshots && (
            <span className="text-[10px] normal-case text-steam-muted">
              {slideshowPaused ? "Paused" : "Auto-slideshow"} · {screenshots!.length} shots
            </span>
          )}
        </div>

        <div className="grid items-start gap-4 p-4 lg:h-[534px] lg:grid-cols-5">
          {hasTrailers && (
            <div ref={trailerColRef} className="space-y-3 lg:col-span-3">
              <div
                ref={trailerVideoRef}
                className="group relative aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-white/10 [&:fullscreen]:aspect-auto [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none"
              >
                {trailerSource ? (
                  <SteamVideo
                    key={currentTrailer.id}
                    source={trailerSource}
                    poster={currentTrailer.thumbnail}
                    mediaRef={trailerMediaRef}
                    autoPlay
                    loop
                    muted={!cinemaOpen}
                    controls={cinemaOpen}
                    seekable={!cinemaOpen}
                    className="h-full w-full"
                  />
                ) : null}

                <div className="pointer-events-none absolute inset-0 z-30">
                  <button
                    type="button"
                    onClick={() => void toggleCinema()}
                    className="pointer-events-auto absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                    aria-label={cinemaOpen ? "Exit fullscreen with sound" : "Fullscreen with sound"}
                  >
                    {cinemaOpen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </button>

                  {playable.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goToPrevTrailer}
                        className="pointer-events-auto absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-80 backdrop-blur-sm transition-opacity hover:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Previous trailer"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goToNextTrailer}
                        className="pointer-events-auto absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-80 backdrop-blur-sm transition-opacity hover:bg-black/70 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Next trailer"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
                        {activeTrailer + 1} / {playable.length}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {playable.length > 1 && (
                <div
                  ref={trailerRailRef}
                  className="flex shrink-0 flex-nowrap gap-2 overflow-x-auto overflow-y-hidden scrollbar-thin"
                  style={{ height: TRAILER_THUMB_HEIGHT }}
                >
                  {playable.map((movie, i) => (
                    <button
                      key={movie.id}
                      ref={(el) => {
                        trailerThumbRefs.current[i] = el;
                      }}
                      type="button"
                      onClick={() => {
                        setActiveTrailer(i);
                        void exitCinema();
                      }}
                      className={`relative block shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${
                        i === activeTrailer
                          ? "ring-steam-accent"
                          : "ring-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ height: TRAILER_THUMB_HEIGHT, width: TRAILER_THUMB_WIDTH }}
                      aria-label={movie.name}
                      aria-current={i === activeTrailer}
                    >
                      <Image
                        src={movie.thumbnail}
                        alt=""
                        fill
                        className="object-cover object-center"
                        sizes={`${TRAILER_THUMB_WIDTH}px`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {hasScreenshots && (
            <div
              className={`space-y-3 ${hasTrailers ? "lg:col-span-2" : "lg:col-span-5"}`}
              onMouseEnter={() => setSlideshowPaused(true)}
              onMouseLeave={() => {
                if (!lightboxOpen) setSlideshowPaused(false);
              }}
            >
              <div
                ref={screenshotPreviewRef}
                className="group relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10"
              >
                <button
                  type="button"
                  onClick={() => openLightbox(activeScreenshot)}
                  className="absolute inset-0 z-[1] cursor-zoom-in"
                  aria-label="View full-size screenshot"
                />
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
                <button
                  type="button"
                  onClick={() => openLightbox(activeScreenshot)}
                  className="absolute right-2 top-2 z-[2] flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="Expand screenshot"
                >
                  <Expand className="h-4 w-4" />
                </button>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-xs text-white/80">
                    {activeScreenshot + 1} / {screenshots!.length}
                  </p>
                </div>
              </div>

              <div
                className={`grid gap-1.5 overflow-y-auto scrollbar-thin content-start ${
                  sideBySide ? "grid-cols-3 max-h-32" : "max-h-48 grid-cols-4 sm:grid-cols-5"
                }`}
                style={
                  sideBySide && thumbStripHeight
                    ? { maxHeight: thumbStripHeight, height: thumbStripHeight }
                    : undefined
                }
              >
                {screenshots!.map((shot, i) => (
                  <button
                    key={shot.id}
                    ref={(el) => {
                      thumbRefs.current[i] = el;
                    }}
                    type="button"
                    onClick={() => {
                      setActiveScreenshot(i);
                      setSlideshowPaused(true);
                    }}
                    onDoubleClick={() => openLightbox(i)}
                    className={`relative h-16 shrink-0 overflow-hidden rounded-md transition-all ${
                      i === activeScreenshot
                        ? "ring-2 ring-steam-accent"
                        : "opacity-50 hover:opacity-100"
                    }`}
                    aria-label={`Screenshot ${i + 1}`}
                    aria-current={i === activeScreenshot}
                  >
                    <Image src={shot.path_thumbnail} alt="" fill className="object-cover" sizes="80px" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {lightboxOpen && hasScreenshots && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={closeLightbox}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {screenshots!.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevScreenshot();
                  }}
                  className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:left-6"
                  aria-label="Previous screenshot"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNextScreenshot();
                  }}
                  className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 sm:right-6"
                  aria-label="Next screenshot"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <motion.div
              key={screenshots![lightboxIndex].id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="relative h-full w-full max-h-[90vh] max-w-6xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={screenshots![lightboxIndex].path_full}
                alt={`${gameName} screenshot ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </motion.div>

            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
              {lightboxIndex + 1} / {screenshots!.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
