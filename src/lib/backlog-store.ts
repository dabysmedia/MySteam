import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getDataDir } from "./data-dir";
import { mergeBacklogs } from "./backlog-merge";
import { getSharedLibrarySyncId } from "./library-sync-id";
import type { BacklogGame, BacklogSnapshot } from "./types";

const BACKLOG_DIR = "backlog";

function backlogFilePath(syncId: string): string {
  return path.join(getDataDir(), BACKLOG_DIR, `${syncId}.json`);
}

async function ensureBacklogDir(): Promise<void> {
  await mkdir(path.join(getDataDir(), BACKLOG_DIR), { recursive: true });
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

async function readBacklogFile(syncId: string): Promise<BacklogSnapshot | null> {
  try {
    const raw = await readFile(backlogFilePath(syncId), "utf8");
    if (!raw) return { games: [], savedAt: new Date(0).toISOString() };
    return parseSnapshot(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { games: [], savedAt: new Date(0).toISOString() };
    }
    return null;
  }
}

/** Merge per-device backlog files into the shared library once. */
async function migrateOrphanedBacklogs(targetSyncId: string): Promise<BacklogSnapshot | null> {
  const backlogDir = path.join(getDataDir(), BACKLOG_DIR);
  let files: string[];

  try {
    files = await readdir(backlogDir);
  } catch {
    return null;
  }

  let mergedGames: BacklogGame[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const syncId = file.slice(0, -".json".length);
    if (syncId === targetSyncId) continue;

    const snapshot = await readBacklogFile(syncId);
    if (!snapshot?.games.length) continue;

    mergedGames = mergeBacklogs(mergedGames, snapshot.games);
  }

  if (mergedGames.length === 0) return null;

  return saveBacklogToStore(targetSyncId, mergedGames);
}

export function isPersistenceEnabled(): boolean {
  return true;
}

export async function loadBacklogFromStore(syncId: string): Promise<BacklogSnapshot | null> {
  const snapshot = await readBacklogFile(syncId);
  if (snapshot === null) return null;

  if (syncId === getSharedLibrarySyncId() && snapshot.games.length === 0) {
    const migrated = await migrateOrphanedBacklogs(syncId);
    if (migrated) return migrated;
  }

  return snapshot;
}

export async function saveBacklogToStore(
  syncId: string,
  games: BacklogGame[]
): Promise<BacklogSnapshot | null> {
  const snapshot: BacklogSnapshot = {
    games,
    savedAt: new Date().toISOString(),
  };

  try {
    await ensureBacklogDir();
    await writeFile(backlogFilePath(syncId), JSON.stringify(snapshot), "utf8");
    return snapshot;
  } catch {
    return null;
  }
}
