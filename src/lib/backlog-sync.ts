"use client";

import type { BacklogGame, BacklogSnapshot } from "./types";
import {
  adoptSyncIdFromUrl,
  getOrCreateSyncId,
} from "./sync-id";
import { mergeBacklogs } from "./backlog-merge";

const STORAGE_KEY = "mysteam-backlog";
const SYNC_DEBOUNCE_MS = 800;
const POLL_VISIBLE_MS = 3000;
const POLL_HIDDEN_MS = 12000;

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncLock = false;
let broadcastChannel: BroadcastChannel | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getBroadcastChannel(): BroadcastChannel | null {
  if (!isBrowser() || typeof BroadcastChannel === "undefined") return null;
  if (!broadcastChannel) {
    broadcastChannel = new BroadcastChannel("mysteam-backlog");
  }
  return broadcastChannel;
}

function gamesEqual(a: BacklogGame[], b: BacklogGame[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function readLocalBacklog(): BacklogGame[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BacklogGame[];
  } catch {
    return [];
  }
}

export function writeLocalBacklog(games: BacklogGame[], broadcast = true): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  window.dispatchEvent(new CustomEvent("mysteam-backlog-changed", { detail: games }));
  if (broadcast) {
    getBroadcastChannel()?.postMessage({ type: "update", games });
  }
}

export async function fetchRemoteSnapshot(syncId: string): Promise<BacklogSnapshot | null> {
  try {
    const res = await fetch(`/api/backlog?syncId=${encodeURIComponent(syncId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      games: (data.games ?? []) as BacklogGame[],
      savedAt: data.savedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function pushRemoteBacklog(syncId: string, games: BacklogGame[]): Promise<boolean> {
  try {
    const res = await fetch("/api/backlog", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-sync-id": syncId,
      },
      body: JSON.stringify({ games }),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

async function withSyncLock<T>(fn: () => Promise<T>): Promise<T | null> {
  if (syncLock) return null;
  syncLock = true;
  try {
    return await fn();
  } finally {
    syncLock = false;
  }
}

export async function pullAndMergeRemote(): Promise<{
  games: BacklogGame[];
  changed: boolean;
  persisted: boolean;
}> {
  const result = await withSyncLock(async () => {
    const syncId = getOrCreateSyncId();
    const remote = await fetchRemoteSnapshot(syncId);

    if (remote === null) {
      return {
        games: readLocalBacklog(),
        changed: false,
        persisted: false,
      };
    }

    const local = readLocalBacklog();
    const merged = mergeBacklogs(local, remote.games);

    let changed = false;
    if (!gamesEqual(merged, local)) {
      writeLocalBacklog(merged, false);
      changed = true;
    }

    if (!gamesEqual(merged, remote.games)) {
      await pushRemoteBacklog(syncId, merged);
    }

    return { games: merged, changed, persisted: true };
  });

  return result ?? { games: readLocalBacklog(), changed: false, persisted: false };
}

export function scheduleRemoteSync(games: BacklogGame[]): void {
  if (!isBrowser()) return;

  if (syncTimer) clearTimeout(syncTimer);

  syncTimer = setTimeout(async () => {
    const syncId = getOrCreateSyncId();
    await withSyncLock(async () => {
      await pushRemoteBacklog(syncId, games);
    });
  }, SYNC_DEBOUNCE_MS);
}

export function flushRemoteSync(games: BacklogGame[]): void {
  if (!isBrowser()) return;
  if (syncTimer) clearTimeout(syncTimer);

  const syncId = getOrCreateSyncId();
  const body = JSON.stringify({ syncId, games });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/backlog",
      new Blob([body], { type: "application/json" })
    );
    return;
  }

  fetch("/api/backlog", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-sync-id": syncId,
    },
    body,
    keepalive: true,
  }).catch(() => {});
}

export async function syncBacklogOnLoad(): Promise<{
  games: BacklogGame[];
  persisted: boolean;
}> {
  adoptSyncIdFromUrl();
  const result = await pullAndMergeRemote();
  return { games: result.games, persisted: result.persisted };
}

export function startRemotePolling(onUpdate?: (games: BacklogGame[]) => void): () => void {
  if (!isBrowser()) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const channel = getBroadcastChannel();
  const onBroadcast = (event: MessageEvent<{ type?: string; games?: BacklogGame[] }>) => {
    if (event.data?.type !== "update" || !Array.isArray(event.data.games)) return;
    const local = readLocalBacklog();
    if (gamesEqual(local, event.data.games)) return;
    writeLocalBacklog(event.data.games, false);
    onUpdate?.(event.data.games);
  };
  channel?.addEventListener("message", onBroadcast);

  async function tick() {
    if (stopped) return;

    const result = await pullAndMergeRemote();
    if (result.changed) {
      onUpdate?.(result.games);
    }

    if (!stopped) {
      const interval =
        document.visibilityState === "visible" ? POLL_VISIBLE_MS : POLL_HIDDEN_MS;
      timer = setTimeout(tick, interval);
    }
  }

  const onVisible = () => {
    if (timer) clearTimeout(timer);
    void pullAndMergeRemote().then((result) => {
      if (result.changed) onUpdate?.(result.games);
    });
    timer = setTimeout(tick, POLL_VISIBLE_MS);
  };

  document.addEventListener("visibilitychange", onVisible);
  void tick();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    channel?.removeEventListener("message", onBroadcast);
  };
}
