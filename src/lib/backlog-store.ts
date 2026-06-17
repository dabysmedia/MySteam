import { get, put } from "@vercel/blob";
import type { BacklogGame, BacklogSnapshot } from "./types";

const BACKLOG_PREFIX = "backlog";

type BlobAccess = "private" | "public";

function backlogPath(syncId: string): string {
  return `${BACKLOG_PREFIX}/${syncId}.json`;
}

function blobOptions(): {
  access: BlobAccess;
  token?: string;
  storeId?: string;
} {
  const options: {
    access: BlobAccess;
    token?: string;
    storeId?: string;
  } = { access: "private" };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    options.token = process.env.BLOB_READ_WRITE_TOKEN;
  }

  if (process.env.BLOB_STORE_ID) {
    options.storeId = process.env.BLOB_STORE_ID;
  }

  return options;
}

function parseSnapshot(raw: string): BacklogSnapshot {
  const parsed: unknown = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return {
      games: parsed as BacklogGame[],
      savedAt: new Date(0).toISOString(),
    };
  }

  const snapshot = parsed as Partial<BacklogSnapshot>;
  if (!Array.isArray(snapshot.games)) {
    return { games: [], savedAt: new Date(0).toISOString() };
  }

  return {
    games: snapshot.games,
    savedAt: snapshot.savedAt ?? new Date(0).toISOString(),
  };
}

export function isPersistenceEnabled(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN);
}

export async function loadBacklogFromStore(syncId: string): Promise<BacklogSnapshot | null> {
  if (!isPersistenceEnabled()) return null;

  try {
    const blob = await get(backlogPath(syncId), blobOptions());
    if (!blob || blob.statusCode === 304 || !blob.stream) {
      return { games: [], savedAt: new Date(0).toISOString() };
    }

    const raw = await new Response(blob.stream).text();
    if (!raw) return { games: [], savedAt: new Date(0).toISOString() };

    return parseSnapshot(raw);
  } catch {
    return null;
  }
}

export async function saveBacklogToStore(
  syncId: string,
  games: BacklogGame[]
): Promise<BacklogSnapshot | null> {
  if (!isPersistenceEnabled()) return null;

  const snapshot: BacklogSnapshot = {
    games,
    savedAt: new Date().toISOString(),
  };

  try {
    await put(backlogPath(syncId), JSON.stringify(snapshot), {
      ...blobOptions(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return snapshot;
  } catch {
    return null;
  }
}
