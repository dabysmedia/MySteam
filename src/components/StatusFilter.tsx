"use client";

import type { BacklogStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusFilterProps {
  active: BacklogStatus | "all";
  counts: Record<BacklogStatus, number>;
  onChange: (status: BacklogStatus | "all") => void;
}

export function StatusFilter({ active, counts, onChange }: StatusFilterProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items: { key: BacklogStatus | "all"; label: string; count: number; color?: string }[] = [
    { key: "all", label: "All", count: total },
    ...(["wishlist", "playing", "completed", "dropped"] as BacklogStatus[]).map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      count: counts[s],
      color: STATUS_COLORS[s],
    })),
  ];

  return (
    <div className="flex flex-wrap gap-2 px-4 sm:px-0">
      {items.map(({ key, label, count, color }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-all sm:px-4 sm:text-sm",
            active === key
              ? "border-steam-border-gold bg-steam-gold/10 text-steam-gold-light"
              : "border-steam-border bg-steam-surface/50 text-steam-muted hover:border-white/15 hover:text-white"
          )}
        >
          {color && (
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          )}
          {label}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
              active === key ? "bg-steam-gold/15" : "bg-white/5"
            )}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}
