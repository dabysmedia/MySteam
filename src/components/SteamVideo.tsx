"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import Hls from "hls.js";
import type { TrailerSource } from "@/lib/steam-video";
import { createMaxQualityHls, lockHlsToMaxQuality } from "@/lib/steam-video";
import {
  applyYoutubeIframeCover,
  loadYouTubeIframeApi,
  setHighestYoutubeQuality,
  waitForElementSize,
} from "@/lib/youtube-player";
import { Volume2, VolumeX, Loader2, Play } from "lucide-react";

interface SteamVideoProps {
  source: TrailerSource | null;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  seekable?: boolean;
  className?: string;
  onEnded?: () => void;
  mediaRef?: Ref<HTMLVideoElement>;
  onPlayingChange?: (playing: boolean) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (muted: boolean) => void;
  showVolumeSlider?: boolean;
  /** Scale video to fill the container (object-cover behavior). */
  cover?: boolean;
  /** Hide YouTube hover chrome; use with cover for cinematic heroes. */
  chromeless?: boolean;
}

export function SteamVideo({
  source,
  poster,
  autoPlay = false,
  loop = true,
  muted = true,
  controls = false,
  seekable = false,
  className = "",
  onEnded,
  mediaRef,
  onPlayingChange,
  volume,
  onVolumeChange,
  onMutedChange,
  showVolumeSlider = false,
  cover = false,
  chromeless = false,
}: SteamVideoProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;

  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (!mediaRef) return;
    if (typeof mediaRef === "function") {
      mediaRef(el);
    } else {
      mediaRef.current = el;
    }
  };
  const hlsRef = useRef<Hls | null>(null);
  const youtubePlayerRef = useRef<YT.Player | null>(null);
  const youtubeContainerRef = useRef<HTMLDivElement>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [internalVolume, setInternalVolume] = useState(volume ?? 1);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const sourceUrl = source?.url;
  const sourceType = source?.type;

  useEffect(() => {
    const video = videoRef.current;
    if (sourceType === "youtube" || !video || !sourceUrl) {
      if (sourceType !== "youtube") {
        setLoading(false);
        setError(!sourceUrl);
      }
      return;
    }

    setLoading(true);
    setError(false);
    setReady(false);
    setProgress(0);

    const onPlaying = () => setReady(true);
    video.addEventListener("playing", onPlaying);
    if (!autoPlay) {
      video.addEventListener("loadeddata", onPlaying, { once: true });
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryPlay = () => {
      if (autoPlay) {
        video.play().catch(() => setReady(true));
      }
    };

    if (sourceType === "hls") {
      if (Hls.isSupported()) {
        const hls = createMaxQualityHls();
        hlsRef.current = hls;
        lockHlsToMaxQuality(hls);
        hls.loadSource(sourceUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          tryPlay();
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            setError(true);
            setLoading(false);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = sourceUrl;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          tryPlay();
        }, { once: true });
      } else {
        setError(true);
        setLoading(false);
      }
    } else {
      video.preload = "auto";
      video.src = sourceUrl;
      video.addEventListener("loadeddata", () => {
        setLoading(false);
        tryPlay();
      }, { once: true });
      video.addEventListener("error", () => {
        setError(true);
        setLoading(false);
      }, { once: true });
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [sourceUrl, sourceType, autoPlay]);

  useEffect(() => {
    if (sourceType !== "youtube" || !sourceUrl) {
      return;
    }

    const host = youtubeContainerRef.current;
    const root = rootRef.current;
    if (!host || !root) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    setLoading(true);
    setError(false);
    setReady(false);

    const layoutIframe = (player: YT.Player) => {
      if (!cover) return;
      try {
        const iframe = player.getIframe();
        const container = youtubeContainerRef.current ?? rootRef.current;
        if (iframe && container) {
          applyYoutubeIframeCover(iframe, container);
        }
      } catch {
        // Player may not be ready yet.
      }
    };

    const scheduleCoverLayout = (player: YT.Player) => {
      layoutIframe(player);
      requestAnimationFrame(() => layoutIframe(player));
      window.setTimeout(() => layoutIframe(player), 250);
    };

    void (async () => {
      await waitForElementSize(root);
      if (cancelled || !youtubeContainerRef.current || !rootRef.current) return;

      await loadYouTubeIframeApi();
      if (cancelled || !youtubeContainerRef.current || !rootRef.current) return;

      youtubePlayerRef.current?.destroy();

      const width = root.clientWidth;
      const height = root.clientHeight;

      youtubePlayerRef.current = new YT.Player(youtubeContainerRef.current, {
        width,
        height,
        videoId: sourceUrl,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          mute: muted ? 1 : 0,
          loop: loop ? 1 : 0,
          playlist: loop ? sourceUrl : undefined,
          controls: chromeless || !controls ? 0 : 1,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
          iv_load_policy: 3,
          disablekb: chromeless ? 1 : 0,
          fs: chromeless ? 0 : 1,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            scheduleCoverLayout(event.target);
            setHighestYoutubeQuality(event.target);
            setLoading(false);
            setReady(true);
            if (autoPlay) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (cancelled) return;
            if (event.data === YT.PlayerState.PLAYING) {
              scheduleCoverLayout(event.target);
              setHighestYoutubeQuality(event.target);
              setIsPlaying(true);
              onPlayingChangeRef.current?.(true);
            } else if (event.data === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              onPlayingChangeRef.current?.(false);
            } else if (event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              onPlayingChangeRef.current?.(false);
              onEndedRef.current?.();
            }
          },
        },
      });

      if (cover && rootRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (youtubePlayerRef.current) {
            layoutIframe(youtubePlayerRef.current);
          }
        });
        resizeObserver.observe(rootRef.current);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [sourceUrl, sourceType, autoPlay, loop, controls, muted, chromeless, cover]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !seekable) return;

    const onTimeUpdate = () => {
      if (!isScrubbing && video.duration > 0) {
        setProgress(video.currentTime / video.duration);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [seekable, isScrubbing]);

  const seekFromClientX = (clientX: number) => {
    const video = videoRef.current;
    const bar = scrubberRef.current;
    if (!video || !bar || !video.duration) return;

    const rect = bar.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = fraction * video.duration;
    setProgress(fraction);
  };

  const handleScrubStart = (clientX: number) => {
    setIsScrubbing(true);
    seekFromClientX(clientX);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
  };

  useEffect(() => {
    if (onMutedChange === undefined) {
      setIsMuted(muted);
    }
  }, [muted, onMutedChange]);

  const displayMuted = onMutedChange !== undefined ? muted : isMuted;
  const displayVolume = onVolumeChange !== undefined ? (volume ?? 0) : internalVolume;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = displayMuted;
    }
  }, [displayMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (displayMuted) return;
    video.volume = Math.min(1, Math.max(0, displayVolume));
  }, [displayVolume, displayMuted]);

  useEffect(() => {
    const player = youtubePlayerRef.current;
    if (!player || sourceType !== "youtube" || !ready) return;

    if (displayMuted) {
      player.mute();
    } else {
      player.unMute();
      player.setVolume(Math.round(Math.min(1, Math.max(0, displayVolume)) * 100));
      setHighestYoutubeQuality(player);
    }
  }, [displayMuted, displayVolume, sourceType, ready]);

  const setVolume = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    if (onVolumeChange) {
      onVolumeChange(clamped);
      if (onMutedChange) {
        onMutedChange(clamped === 0);
      }
      return;
    }
    setInternalVolume(clamped);
    if (clamped === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  const toggleMute = () => {
    const next = !displayMuted;
    if (onMutedChange) {
      onMutedChange(next);
      if (!next && onVolumeChange && (volume ?? 0) === 0) {
        onVolumeChange(0.5);
      }
      return;
    }
    if (!next && internalVolume === 0) {
      setInternalVolume(0.5);
    }
    setIsMuted(next);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      onPlayingChangeRef.current?.(true);
    };
    const onPause = () => {
      setIsPlaying(false);
      onPlayingChangeRef.current?.(false);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [sourceUrl, loading]);

  const togglePlay = () => {
    if (sourceType === "youtube") {
      const player = youtubePlayerRef.current;
      if (!player) return;
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const willPlay = video.paused;
    setIsPlaying(willPlay);

    if (willPlay) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  };

  if (!source) return null;

  if (sourceType === "youtube") {
    return (
      <div ref={rootRef} className={`relative overflow-hidden bg-black ${className}`}>
        <div
          ref={youtubeContainerRef}
          className={
            cover
              ? "absolute inset-0 overflow-hidden"
              : "h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
          }
        />
        {chromeless && <div className="absolute inset-0 z-[4]" aria-hidden />}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <Loader2 className="h-8 w-8 animate-spin text-steam-accent" />
          </div>
        )}
        {poster && !ready && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${poster})` }}
          />
        )}
        {!controls && ready && !error && !chromeless && (
          <button
            type="button"
            onClick={togglePlay}
            className="pointer-events-auto absolute left-1/2 top-1/2 z-[5] flex h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {!isPlaying && (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white opacity-80 backdrop-blur-sm">
                <Play className="h-7 w-7 fill-white" />
              </div>
            )}
          </button>
        )}
        {!controls && ready && !error && (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-20 flex items-center gap-2">
            {showVolumeSlider && (
              <input
                type="range"
                min={0}
                max={100}
                value={displayMuted ? 0 : Math.round(displayVolume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-steam-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                aria-label="Volume"
              />
            )}
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
              aria-label={displayMuted ? "Unmute" : "Mute"}
            >
              {displayMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`relative overflow-hidden ${className}`}>
      <video
        ref={setVideoRef}
        poster={autoPlay ? undefined : poster}
        loop={loop}
        muted={displayMuted}
        playsInline
        controls={controls}
        onEnded={onEnded}
        className={`h-full w-full object-cover transition-opacity duration-150 ${
          autoPlay && !ready ? "opacity-0" : "opacity-100"
        }`}
      />

      {autoPlay && !ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-steam-accent" />}
        </div>
      )}

      {error && poster && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}

      {!controls && ready && !error && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute left-1/2 top-1/2 z-[5] flex h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {!isPlaying && (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white opacity-80 backdrop-blur-sm">
              <Play className="h-7 w-7 fill-white" />
            </div>
          )}
        </button>
      )}

      {seekable && ready && !error && (
        <div
          ref={scrubberRef}
          className="absolute inset-x-0 bottom-0 z-10 cursor-pointer px-2 pb-2 pt-6"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handleScrubStart(e.clientX);
          }}
          onPointerMove={(e) => {
            if (isScrubbing) seekFromClientX(e.clientX);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            handleScrubEnd();
          }}
          onPointerCancel={handleScrubEnd}
        >
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-steam-accent transition-[width] duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {!controls && ready && !error && (
        <div
          className={`absolute right-3 z-20 flex items-center gap-2 ${
            seekable ? "bottom-8" : "bottom-3"
          }`}
        >
          {showVolumeSlider && (
            <input
              type="range"
              min={0}
              max={100}
              value={displayMuted ? 0 : Math.round(displayVolume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/25 accent-steam-accent [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              aria-label="Volume"
            />
          )}
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
            aria-label={displayMuted ? "Unmute" : "Mute"}
          >
            {displayMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
