export const SYNC_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

export const DEFAULT_LIBRARY_SYNC_ID = "mysteam-library";

export function isValidSyncId(id: string): boolean {
  return SYNC_ID_PATTERN.test(id);
}

/** Single shared library ID used by every device (override via LIBRARY_SYNC_ID). */
export function getSharedLibrarySyncId(): string {
  const configured = process.env.LIBRARY_SYNC_ID?.trim();
  if (configured && isValidSyncId(configured)) return configured;
  return DEFAULT_LIBRARY_SYNC_ID;
}
