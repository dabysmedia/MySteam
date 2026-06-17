import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getDataDir } from "./data-dir";
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

export function isPersistenceEnabled(): boolean {
  return true;
}

export async function loadBacklogFromStore(syncId: string): Promise<BacklogSnapshot | null> {
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
