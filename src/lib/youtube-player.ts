const YOUTUBE_QUALITY_ORDER = [
  "highres",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
  "large",
] as const;

let ytReady: Promise<void> | null = null;

export function youtubeMaxThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytReady) return ytReady;

  ytReady = new Promise((resolve) => {
    const finish = () => resolve();
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      if (window.YT?.Player) finish();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });

  return ytReady;
}

/** Ask YouTube for the highest rendition the video supports (best-effort). */
export function setHighestYoutubeQuality(player: YT.Player): void {
  for (const quality of YOUTUBE_QUALITY_ORDER) {
    try {
      player.setPlaybackQuality(quality);
    } catch {
      // YouTube ignores qualities that are not available for this video.
    }
  }
}

const VIDEO_ASPECT = 16 / 9;

/** Size a YouTube iframe to cover its container (object-cover for 16:9 video). */
export function applyYoutubeIframeCover(
  iframe: HTMLIFrameElement,
  container: HTMLElement
): void {
  const ar = container.clientWidth / container.clientHeight;
  if (!Number.isFinite(ar) || ar <= 0) return;

  const widthPct = ar > VIDEO_ASPECT ? (ar / VIDEO_ASPECT) * 100 : 100;
  const heightPct = ar > VIDEO_ASPECT ? 100 : (VIDEO_ASPECT / ar) * 100;

  iframe.style.position = "absolute";
  iframe.style.top = "50%";
  iframe.style.left = "50%";
  iframe.style.transform = "translate(-50%, -50%)";
  iframe.style.width = `${widthPct}%`;
  iframe.style.height = `${heightPct}%`;
  iframe.style.maxWidth = "none";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";
}

export function waitForElementSize(el: HTMLElement): Promise<void> {
  if (el.clientWidth > 0 && el.clientHeight > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(el);
  });
}

export function buildChromelessEmbedUrl(
  videoId: string,
  options: { autoPlay?: boolean; loop?: boolean; muted?: boolean }
): string {
  const params = new URLSearchParams({
    autoplay: options.autoPlay ? "1" : "0",
    mute: options.muted ? "1" : "0",
    loop: options.loop ? "1" : "0",
    playlist: options.loop ? videoId : "",
    controls: "0",
    playsinline: "1",
    modestbranding: "1",
    rel: "0",
    iv_load_policy: "3",
    disablekb: "1",
    fs: "0",
    showinfo: "0",
    cc_load_policy: "0",
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
