const SYNC_ID_KEY = "mysteam-sync-id";
const COOKIE_NAME = "mysteam-sync-id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 years

const SYNC_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isValidSyncId(id: string): boolean {
  return SYNC_ID_PATTERN.test(id);
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

export function getOrCreateSyncId(): string {
  if (!isBrowser()) return "";

  let id = localStorage.getItem(SYNC_ID_KEY) ?? readCookie();

  if (!id) {
    id = crypto.randomUUID();
  }

  persistSyncId(id);
  return id;
}

export function getSyncId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(SYNC_ID_KEY) ?? readCookie();
}

export function setSyncId(id: string): boolean {
  if (!isBrowser() || !isValidSyncId(id)) return false;
  persistSyncId(id);
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
