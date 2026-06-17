"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { BacklogStatus } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlannerActionsProps {
  inPlan: boolean;
  currentStatus?: BacklogStatus;
  onAdd: (status: BacklogStatus) => void;
  onRemove: () => void;
  onStatusChange: (status: BacklogStatus) => void;
  layout?: "sidebar" | "inline";
}

const plannerStatuses: { status: BacklogStatus; label: string; description: string }[] = [
  { status: "playing", label: "Play Now", description: "Set as your current game" },
  { status: "wishlist", label: "Want to Play", description: "Add to your queue" },
  { status: "completed", label: "Completed", description: "Mark as finished" },
  { status: "dropped", label: "Dropped", description: "Remove from active plans" },
];

export function PlannerActions({
  inPlan,
  currentStatus,
  onAdd,
  onRemove,
  onStatusChange,
  layout = "sidebar",
}: PlannerActionsProps) {
  const [open, setOpen] = useState(false);

  if (!inPlan) {
    return (
      <div className={cn("flex flex-col gap-2", layout === "sidebar" ? "w-full" : "")}>
        <button onClick={() => onAdd("wishlist")} className="btn-steam-green w-full">
          Add to Planner
        </button>
        <button
          onClick={() => onAdd("playing")}
          className="btn-steam-secondary w-full text-center"
        >
          Start Playing
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="btn-steam-green flex w-full items-center justify-center gap-2"
        >
          <Check className="h-4 w-4" />
          {STATUS_LABELS[currentStatus ?? "wishlist"]}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        <button
          onClick={onRemove}
          className="w-full py-1.5 text-center text-xs text-steam-muted hover:text-steam-text"
        >
          Remove from planner
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-sm border border-steam-border bg-steam-dark shadow-xl">
            {plannerStatuses.map(({ status, label, description }) => (
              <button
                key={status}
                onClick={() => {
                  onStatusChange(status);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-steam-border px-3 py-2.5 text-left last:border-b-0 hover:bg-steam-elevated/30",
                  currentStatus === status && "bg-steam-elevated/20"
                )}
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status] }}
                />
                <div>
                  <p className="text-sm text-steam-text-bright">{label}</p>
                  <p className="text-xs text-steam-muted">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Keep BacklogButton as alias for any remaining imports
export { PlannerActions as BacklogButton };
