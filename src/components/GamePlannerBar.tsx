"use client";

import { useState } from "react";
import { Check, ChevronDown, LayoutGrid, Play } from "lucide-react";
import type { BacklogStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface GamePlannerBarProps {
  inPlan: boolean;
  currentStatus?: BacklogStatus;
  onAdd: (status: BacklogStatus) => void;
  onStatusChange: (status: BacklogStatus) => void;
}

const quickStatuses: { status: BacklogStatus; label: string; icon: typeof LayoutGrid }[] = [
  { status: "wishlist", label: "Queue", icon: LayoutGrid },
  { status: "playing", label: "Play Now", icon: Play },
];

export function GamePlannerBar({
  inPlan,
  currentStatus,
  onAdd,
  onStatusChange,
}: GamePlannerBarProps) {
  const [open, setOpen] = useState(false);

  if (!inPlan) {
    return (
      <button
        type="button"
        onClick={() => onAdd("wishlist")}
        className="steamos-chip steamos-chip-blue flex items-center gap-2 px-4 py-2.5 text-sm font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md sm:px-5"
      >
        <LayoutGrid className="h-4 w-4" />
        Add to Planner
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="steamos-chip steamos-chip-green flex items-center gap-2 px-4 py-2.5 text-sm font-semibold normal-case tracking-normal shadow-lg backdrop-blur-md sm:px-5"
      >
        <Check className="h-4 w-4" />
        {STATUS_LABELS[currentStatus ?? "wishlist"]}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-xl border border-steam-border bg-steam-dark/95 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-0">
            {quickStatuses.map(({ status, label, icon: Icon }) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onStatusChange(status);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-steam-border px-4 py-3 text-left last:border-b-0 hover:bg-white/5",
                  currentStatus === status && "bg-white/[0.06]"
                )}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${STATUS_COLORS[status]}22`, color: STATUS_COLORS[status] }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-steam-text-bright">{label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onStatusChange("completed");
                setOpen(false);
              }}
              className="flex w-full px-4 py-2.5 text-left text-xs text-steam-muted hover:bg-white/5 hover:text-steam-text"
            >
              Mark completed…
            </button>
          </div>
        </>
      )}
    </div>
  );
}
