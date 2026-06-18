"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import Hls from "hls.js";
import type { TrailerSource } from "@/lib/steam-video";
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
}: SteamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
  const scrubberRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  const sourceUrl = source?.url;
  const sourceType = source?.type;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sourceUrl) {
      setLoading(false);
      setError(!sourceUrl);
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
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
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
    setIsMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    setIsPlaying(!video.paused);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [sourceUrl, loading]);

  const togglePlay = () => {
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={setVideoRef}
        poster={autoPlay ? undefined : poster}
        loop={loop}
        muted={isMuted}
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

      {!controls && ready && (
        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          className={`absolute right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 ${
            seekable ? "bottom-8" : "bottom-3"
          }`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
