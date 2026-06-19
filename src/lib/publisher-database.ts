import { readFile } from "fs/promises";
import path from "path";

export type SingleplayerRelevance = "high" | "medium" | "low";

export interface PublisherCatalogMeta {
  name?: string;
  developers: string[];
  publishers: string[];
}

export interface PublisherEntry {
  name: string;
  role: string;
  tier: string;
  region: string;
  singleplayer_relevance: SingleplayerRelevance;
  notable_singleplayer: string[];
  tags: string[];
}

export interface PublisherMatch {
  entry: PublisherEntry;
  matchedStudio: string;
}

const TIER_SCORES: Record<string, number> = {
  platform_holder: 35,
  aaa: 30,
  aa: 22,
  indie_publisher: 18,
  indie: 15,
  publisher: 12,
};

const RELEVANCE_SCORES: Record<SingleplayerRelevance, number> = {
  high: 25,
  medium: 12,
  low: 0,
};

let cachedEntries: PublisherEntry[] | null = null;
let loadPromise: Promise<PublisherEntry[]> | null = null;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function studioNamesMatch(dbName: string, steamName: string): boolean {
  const normalizedSteam = normalizeName(steamName);
  if (!normalizedSteam) return false;

  for (const part of dbName.split("/")) {
    const normalizedDb = normalizeName(part);
    if (!normalizedDb) continue;
    if (normalizedDb === normalizedSteam) return true;
    if (normalizedDb.includes(normalizedSteam) || normalizedSteam.includes(normalizedDb)) {
      return true;
    }
  }

  return false;
}

function normalizeGameTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function gameTitlesMatch(notable: string, gameName: string): boolean {
  const normalizedNotable = normalizeGameTitle(notable);
  const normalizedGame = normalizeGameTitle(gameName);
  if (!normalizedNotable || !normalizedGame) return false;
  if (normalizedNotable === normalizedGame) return true;
  return (
    normalizedGame.includes(normalizedNotable) || normalizedNotable.includes(normalizedGame)
  );
}

async function readPublisherDatabase(): Promise<PublisherEntry[]> {
  const candidates = [
    path.join(process.cwd(), "src/data/publishers.jsonl"),
    path.join(process.cwd(), "jsonl.txt"),
  ];

  let raw: string | null = null;
  for (const filePath of candidates) {
    try {
      raw = await readFile(filePath, "utf8");
      break;
    } catch {
      // Try the next location.
    }
  }

  if (!raw) return [];
  const entries: PublisherEntry[] = [];
  const seen = new Set<string>();

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const entry = JSON.parse(trimmed) as PublisherEntry;
      const key = entry.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    } catch {
      // Skip malformed lines.
    }
  }

  return entries;
}

export async function getPublisherDatabase(): Promise<PublisherEntry[]> {
  if (cachedEntries) return cachedEntries;
  if (!loadPromise) {
    loadPromise = readPublisherDatabase().then((entries) => {
      cachedEntries = entries;
      return entries;
    });
  }
  return loadPromise;
}

export function matchPublisherStudios(
  entries: PublisherEntry[],
  studios: string[]
): PublisherMatch[] {
  const matches: PublisherMatch[] = [];

  for (const studio of studios) {
    for (const entry of entries) {
      if (entry.singleplayer_relevance === "low") continue;
      if (studioNamesMatch(entry.name, studio)) {
        matches.push({ entry, matchedStudio: studio });
      }
    }
  }

  return matches;
}

export function matchNotableTitle(
  entries: PublisherEntry[],
  gameName: string
): PublisherMatch | null {
  for (const entry of entries) {
    if (entry.singleplayer_relevance === "low") continue;
    for (const title of entry.notable_singleplayer) {
      if (gameTitlesMatch(title, gameName)) {
        return { entry, matchedStudio: entry.name };
      }
    }
  }

  return null;
}

export function matchesPublisherCatalog(
  entries: PublisherEntry[],
  meta: PublisherCatalogMeta
): boolean {
  if (entries.length === 0) return true;
  const studios = [...meta.developers, ...meta.publishers];
  if (matchPublisherStudios(entries, studios).length > 0) return true;
  if (meta.name && matchNotableTitle(entries, meta.name)) return true;
  return false;
}

/** Browse sections: platform holders, AAA, and AA only. */
export const BROWSE_MAJOR_TIER_MAX = 2;

export function matchesMajorPublisherCatalog(
  entries: PublisherEntry[],
  meta: PublisherCatalogMeta
): boolean {
  if (!matchesPublisherCatalog(entries, meta)) return false;
  return getBestPublisherTierSortKey(entries, meta) <= BROWSE_MAJOR_TIER_MAX;
}

const TIER_SORT_ORDER: Record<string, number> = {
  platform_holder: 0,
  aaa: 1,
  aa: 2,
  indie_publisher: 3,
  publisher_collective: 3,
  indie: 4,
  publisher: 5,
  publisher_group: 5,
};

export function getBestPublisherTierSortKey(
  entries: PublisherEntry[],
  meta: PublisherCatalogMeta
): number {
  const studios = [...meta.developers, ...meta.publishers];
  const studioMatches = matchPublisherStudios(entries, studios);
  const titleMatch = meta.name ? matchNotableTitle(entries, meta.name) : null;
  const matches = titleMatch ? [...studioMatches, titleMatch] : studioMatches;

  if (matches.length === 0) return 99;

  return Math.min(...matches.map((match) => TIER_SORT_ORDER[match.entry.tier] ?? 6));
}

function scorePublisherEntry(entry: PublisherEntry): number {
  return (
    (TIER_SCORES[entry.tier] ?? 10) + (RELEVANCE_SCORES[entry.singleplayer_relevance] ?? 0)
  );
}

export function scorePublisherDatabaseMatch(
  entries: PublisherEntry[],
  meta: PublisherCatalogMeta
): number {
  const studios = [...meta.developers, ...meta.publishers];
  const studioMatches = matchPublisherStudios(entries, studios);
  const titleMatch = meta.name ? matchNotableTitle(entries, meta.name) : null;
  const matches = titleMatch ? [...studioMatches, titleMatch] : studioMatches;

  if (matches.length === 0) return 0;

  const bestEntryScore = Math.max(...matches.map((match) => scorePublisherEntry(match.entry)));
  return bestEntryScore + (matches.length >= 2 ? 10 : 0);
}
