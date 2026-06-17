"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { TrailerSource } from "@/lib/steam-video";
import { Volume2, VolumeX, Loader2 } from "lucide-react";

interface SteamVideoProps {
  source: TrailerSource | null;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onEnded?: () => void;
}

export function SteamVideo({
  source,
  poster,
  autoPlay = false,
  loop = true,
  muted = true,
  controls = false,
  className = "",
  onEnded,
}: SteamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source?.url) {
      setLoading(false);
      setError(!source?.url);
      return;
    }

    setLoading(true);
    setError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryPlay = () => {
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };

    if (source.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(source.url);
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
        video.src = source.url;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          tryPlay();
        }, { once: true });
      } else {
        setError(true);
        setLoading(false);
      }
    } else {
      video.src = source.url;
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
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source, autoPlay]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (!source) return null;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        loop={loop}
        muted={isMuted}
        playsInline
        controls={controls}
        onEnded={onEnded}
        className="h-full w-full object-cover"
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-steam-accent" />
        </div>
      )}

      {error && poster && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${poster})` }}
        />
      )}

      {!controls && !loading && (
        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
