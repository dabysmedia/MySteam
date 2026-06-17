import { isValidSyncId } from "./library-sync-id";

const SYNC_ID_KEY = "mysteam-sync-id";
const COOKIE_NAME = "mysteam-sync-id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

let resolvedSyncId: string | null = null;
let initPromise: Promise<string> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readCookie(): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(id: string): void {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function persistSyncId(id: string): void {
  localStorage.setItem(SYNC_ID_KEY, id);
  writeCookie(id);
}

function notifySyncIdChanged(): void {
  window.dispatchEvent(new CustomEvent("mysteam-sync-id-changed"));
}

function createLocalSyncId(): string {
  const id = crypto.randomUUID();
  persistSyncId(id);
  return id;
}

async function fetchSharedSyncId(): Promise<string | null> {
  try {
    const res = await fetch("/api/sync-config", { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as { syncId?: string };
    if (data.syncId && isValidSyncId(data.syncId)) {
      return data.syncId;
    }
  } catch {
    return null;
  }

  return null;
}

/** Resolve the sync ID once per session — all devices share the server library ID. */
export async function initSyncId(): Promise<string> {
  if (resolvedSyncId) return resolvedSyncId;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!isBrowser()) return "";

    if (adoptSyncIdFromUrl()) {
      resolvedSyncId = getSyncId() ?? createLocalSyncId();
      return resolvedSyncId;
    }

    const sharedId = await fetchSharedSyncId();
    if (sharedId) {
      const existing = getSyncId();
      if (existing !== sharedId) {
        persistSyncId(sharedId);
        if (existing) notifySyncIdChanged();
      }
      resolvedSyncId = sharedId;
      return sharedId;
    }

    const existing = getSyncId();
    if (existing) {
      resolvedSyncId = existing;
      return existing;
    }

    resolvedSyncId = createLocalSyncId();
    return resolvedSyncId;
  })();

  return initPromise;
}

export function getOrCreateSyncId(): string {
  if (resolvedSyncId) return resolvedSyncId;

  if (!isBrowser()) return "";

  const existing = localStorage.getItem(SYNC_ID_KEY) ?? readCookie();
  if (existing) return existing;

  return createLocalSyncId();
}

export function getSyncId(): string | null {
  if (!isBrowser()) return null;
  return resolvedSyncId ?? localStorage.getItem(SYNC_ID_KEY) ?? readCookie();
}

export function setSyncId(id: string): boolean {
  if (!isBrowser() || !isValidSyncId(id)) return false;
  persistSyncId(id);
  resolvedSyncId = id;
  notifySyncIdChanged();
  return true;
}

export function buildLibraryUrl(syncId?: string): string {
  const id = syncId ?? getOrCreateSyncId();
  const url = new URL(window.location.origin);
  url.pathname = "/";
  url.searchParams.set("library", id);
  return url.toString();
}

export function adoptLibraryFromInput(value: string): boolean {
  if (!isBrowser()) return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  if (isValidSyncId(trimmed)) {
    return setSyncId(trimmed);
  }

  try {
    const url = new URL(trimmed, window.location.origin);
    const id = url.searchParams.get("library") ?? url.searchParams.get("sync");
    if (id && isValidSyncId(id)) {
      return setSyncId(id);
    }
  } catch {
    return false;
  }

  return false;
}

export function adoptSyncIdFromUrl(): boolean {
  if (!isBrowser()) return false;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("library") ?? params.get("sync");
  if (!id || !isValidSyncId(id)) return false;

  const changed = setSyncId(id);

  params.delete("library");
  params.delete("sync");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);

  return changed;
}

export { isValidSyncId };
