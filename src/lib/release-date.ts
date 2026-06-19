export interface ParsedRelease {
  label: string;
  sortKey: number;
  isFuture: boolean;
  isComingSoon: boolean;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseReleaseDate(
  dateStr: string | undefined,
  comingSoon = false
): ParsedRelease | null {
  if (!dateStr) {
    if (comingSoon) {
      return { label: "Coming Soon", sortKey: Infinity, isFuture: true, isComingSoon: true };
    }
    return null;
  }

  const raw = dateStr.trim();
  const lower = raw.toLowerCase();

  if (lower.includes("coming soon") || lower.includes("to be announced") || lower === "tbd") {
    return { label: raw, sortKey: Infinity, isFuture: true, isComingSoon: true };
  }

  // "Jun 15, 2026" or "15 Jun, 2026"
  const fullDate = raw.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (fullDate) {
    const month = MONTHS[fullDate[1].toLowerCase()];
    const day = parseInt(fullDate[2], 10);
    const year = parseInt(fullDate[3], 10);
    if (month !== undefined) {
      const d = new Date(year, month, day);
      return buildResult(d, raw, comingSoon);
    }
  }

  // "2026" only
  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) {
    const d = new Date(parseInt(yearOnly[1], 10), 11, 31);
    return buildResult(d, raw, comingSoon);
  }

  // "Q1 2026" / "Q2 2025"
  const quarter = raw.match(/Q([1-4])\s+(\d{4})/i);
  if (quarter) {
    const q = parseInt(quarter[1], 10);
    const year = parseInt(quarter[2], 10);
    const month = (q - 1) * 3 + 2;
    const d = new Date(year, month, 15);
    return buildResult(d, raw, comingSoon);
  }

  // "Jun 2026"
  const monthYear = raw.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    const year = parseInt(monthYear[2], 10);
    if (month !== undefined) {
      const d = new Date(year, month, 15);
      return buildResult(d, raw, comingSoon);
    }
  }

  if (comingSoon) {
    return { label: raw, sortKey: Infinity - 1, isFuture: true, isComingSoon: true };
  }

  return { label: raw, sortKey: 0, isFuture: false, isComingSoon: false };
}

/** Millisecond timestamp for browse sorting; Infinity = undated / TBD; 0 = unknown. */
export function releaseSortKey(dateStr: string | undefined, comingSoon = false): number {
  if (!dateStr) {
    return comingSoon ? Infinity : 0;
  }

  const raw = dateStr.trim();
  const lower = raw.toLowerCase();

  if (lower.includes("coming soon") || lower.includes("to be announced") || lower === "tbd") {
    return Infinity;
  }

  const fullDate = raw.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (fullDate) {
    const month = MONTHS[fullDate[1].toLowerCase()];
    const day = parseInt(fullDate[2], 10);
    const year = parseInt(fullDate[3], 10);
    if (month !== undefined) {
      return new Date(year, month, day).getTime();
    }
  }

  const yearOnly = raw.match(/^(\d{4})$/);
  if (yearOnly) {
    return new Date(parseInt(yearOnly[1], 10), 11, 31).getTime();
  }

  const quarter = raw.match(/Q([1-4])\s+(\d{4})/i);
  if (quarter) {
    const q = parseInt(quarter[1], 10);
    const year = parseInt(quarter[2], 10);
    const month = (q - 1) * 3 + 2;
    return new Date(year, month, 15).getTime();
  }

  const monthYear = raw.match(/^(\w+)\s+(\d{4})$/i);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    const year = parseInt(monthYear[2], 10);
    if (month !== undefined) {
      return new Date(year, month, 15).getTime();
    }
  }

  return comingSoon ? Infinity : 0;
}

function buildResult(d: Date, label: string, comingSoon: boolean): ParsedRelease {
  const today = startOfToday();
  const isFuture = d.getTime() >= today.getTime() || comingSoon;
  return {
    label,
    sortKey: isFuture ? d.getTime() : 0,
    isFuture,
    isComingSoon: comingSoon && isFuture,
  };
}

export function daysUntilRelease(parsed: ParsedRelease): number | null {
  if (!parsed.isFuture || parsed.sortKey === Infinity) return null;
  const today = startOfToday();
  const diff = parsed.sortKey - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatCountdown(days: number | null): string | null {
  if (days === null) return null;
  if (days <= 0) return "Releasing soon";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  if (days < 365) return `${Math.ceil(days / 30)} months`;
  return `${Math.ceil(days / 365)} years`;
}
