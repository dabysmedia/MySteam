"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Gamepad2,
  Image as ImageIcon,
  Music,
  PenLine,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { BacklogGame, GameNoteEntry, GameRatingCategory, GameRatings } from "@/lib/types";
import { RATING_CATEGORIES } from "@/lib/types";
import { getNoteLog } from "@/lib/backlog";

const MAX_RATING = 5;

const RATING_META: Record<
  GameRatingCategory,
  { icon: typeof Star; accent: string; hint: string }
> = {
  graphics: {
    icon: ImageIcon,
    accent: "text-steam-accent",
    hint: "Visual fidelity, art direction, effects",
  },
  music: {
    icon: Music,
    accent: "text-steam-link",
    hint: "Score, sound design, voice acting",
  },
  story: {
    icon: BookOpen,
    accent: "text-steam-gold-light",
    hint: "Plot, characters, world-building",
  },
  gameplay: {
    icon: Gamepad2,
    accent: "text-steam-green-bright",
    hint: "Mechanics, pacing, fun factor",
  },
};

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

interface GameProgressPanelProps {
  game: BacklogGame;
  variant?: "playing" | "completed";
  onAddNote: (text: string) => void;
  onRemoveNote: (noteId: string) => void;
  onRatingsChange: (ratings: Partial<GameRatings>) => void;
}

function averageRating(ratings?: GameRatings): number | null {
  const values = RATING_CATEGORIES.map((c) => ratings?.[c.key]).filter(
    (v): v is number => v != null
  );
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ratedCount(ratings?: GameRatings): number {
  if (!ratings) return 0;
  return RATING_CATEGORIES.filter((c) => ratings[c.key] != null).length;
}

function formatNoteDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatNoteTitle(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SubsectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-steam-muted">
      <Icon className="h-3.5 w-3.5 text-steam-accent" />
      {children}
    </div>
  );
}

function OverallScore({ average, count }: { average: number; count: number }) {
  const rounded = average.toFixed(1);

  return (
    <span
      className="steamos-chip steamos-chip-gold px-2 py-0.5 text-[10px] normal-case tracking-normal"
      title={`${count} of ${RATING_CATEGORIES.length} categories rated`}
    >
      <span className="font-bold">{rounded}</span>
      <span className="mx-1 opacity-50">·</span>
      <span>Overall</span>
    </span>
  );
}

function CategoryRating({
  category,
  label,
  value,
  onChange,
}: {
  category: GameRatingCategory;
  label: string;
  value?: number;
  onChange: (rating: number | undefined) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  const meta = RATING_META[category];
  const Icon = meta.icon;
  const fillPct = value ? (value / MAX_RATING) * 100 : 0;
  const isRated = value != null;

  return (
    <div
      className={`steamos-card group p-4 ${isRated ? "border-steam-border-gold/50" : ""}`}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-steamos)] bg-white/[0.04] ring-1 ring-white/[0.08] ${meta.accent}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-medium text-steam-text-bright">{label}</p>
            <p className="text-caption">{meta.hint}</p>
          </div>
        </div>
        {isRated && (
          <span className="steamos-chip steamos-chip-gold shrink-0 px-2 py-0.5 text-[10px] normal-case tracking-normal">
            {RATING_LABELS[value]}
          </span>
        )}
      </div>

      <div className="steamos-rating-track mb-3">
        <div
          className={`steamos-rating-fill ${isRated ? "steamos-rating-fill-gold" : ""}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5" role="group" aria-label={`${label} rating`}>
          {Array.from({ length: MAX_RATING }, (_, i) => {
            const star = i + 1;
            const filled = star <= display;
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onClick={() => onChange(value === star ? undefined : star)}
                className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-steam-accent"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                aria-pressed={value === star}
              >
                <Star
                  className={`h-[18px] w-[18px] transition-colors ${
                    filled
                      ? "fill-steam-gold text-steam-gold"
                      : "fill-transparent text-white/15 group-hover:text-white/25"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {isRated ? (
          <span className="text-sm font-semibold tabular-nums text-steam-text-bright">
            {value}/{MAX_RATING}
          </span>
        ) : (
          <span className="text-caption">Not rated</span>
        )}
      </div>
    </div>
  );
}

function NoteEntry({
  entry,
  onRemove,
}: {
  entry: GameNoteEntry;
  onRemove: (id: string) => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      className="group relative pl-4"
    >
      <span
        className="absolute left-0 top-4 h-2 w-2 rounded-full bg-steam-accent/80 ring-2 ring-steam-accent/20"
        aria-hidden
      />
      <div className="steamos-journal-entry p-3.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <time
            dateTime={entry.createdAt}
            title={formatNoteTitle(entry.createdAt)}
            className="text-eyebrow normal-case tracking-wide"
          >
            {formatNoteDate(entry.createdAt)}
          </time>
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="rounded-md p-1 text-steam-muted opacity-0 transition-all hover:bg-white/5 hover:text-steam-text group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-steam-accent"
            aria-label="Delete this entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-steam-text">{entry.text}</p>
      </div>
    </motion.li>
  );
}

export function GameProgressPanel({
  game,
  variant = "playing",
  onAddNote,
  onRemoveNote,
  onRatingsChange,
}: GameProgressPanelProps) {
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCompleted = variant === "completed";
  const ratings = game.ratings;
  const rated = ratedCount(ratings);
  const average = averageRating(ratings);
  const notes = getNoteLog(game);

  useEffect(() => {
    setDraft("");
    setComposerOpen(false);
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [game.appId]);

  useEffect(() => {
    if (composerOpen) {
      textareaRef.current?.focus();
    }
  }, [composerOpen]);

  const handleSaveNote = () => {
    const text = draft.trim();
    if (!text) return;
    onAddNote(text);
    setDraft("");
    setComposerOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleCancelComposer = () => {
    setDraft("");
    setComposerOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveNote();
    }
  };

  const handleRatingChange = (category: GameRatingCategory, rating: number | undefined) => {
    onRatingsChange({ [category]: rating });
  };

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header flex flex-wrap items-center justify-between gap-2">
        <span>{isCompleted ? "My Review" : "My Progress"}</span>
        <div className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
          {average != null && <OverallScore average={average} count={rated} />}
          {isCompleted && (
            <span className="steamos-chip steamos-chip-green px-2 py-0.5 text-[10px]">
              Completed
            </span>
          )}
          {notes.length > 0 && (
            <span className="steamos-chip steamos-chip-muted px-2 py-0.5 text-[10px]">
              {notes.length} {notes.length === 1 ? "entry" : "entries"}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Ratings */}
        <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-5">
          <div>
            <SubsectionLabel icon={Star}>
              {isCompleted ? "Your Ratings" : "Rate as You Play"}
            </SubsectionLabel>
            <p className="text-caption -mt-1">
              Tap stars to score — click the same star again to clear.
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            {RATING_CATEGORIES.map(({ key, label }) => (
              <CategoryRating
                key={key}
                category={key}
                label={label}
                value={ratings?.[key]}
                onChange={(rating) => handleRatingChange(key, rating)}
              />
            ))}
          </div>
        </div>

        <div className="steamos-divider-vertical mx-5 hidden lg:block" aria-hidden />
        <div className="mx-4 h-px bg-steam-border lg:hidden" aria-hidden />

        {/* Journal */}
        <div className="flex w-full flex-col p-4 sm:p-5 lg:w-[min(100%,22rem)] lg:shrink-0 xl:w-80">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <SubsectionLabel icon={PenLine}>Play Journal</SubsectionLabel>
              <p className="text-caption -mt-1">
                {savedFlash
                  ? "Entry saved."
                  : "Save timestamped entries as you go."}
              </p>
            </div>
            {!composerOpen && (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="btn-steam-secondary shrink-0 px-3 py-1.5 text-xs"
              >
                Add entry
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {composerOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="steamos-journal-composer mb-4 p-3.5">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isCompleted
                        ? "Wrap-up thoughts, standout moments…"
                        : "Where you left off, a boss fight, a plot twist…"
                    }
                    rows={3}
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-steam-text outline-none placeholder:text-steam-muted/50"
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-steam-border pt-3">
                    <span className="text-caption">Ctrl+Enter to save</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCancelComposer}
                        className="rounded-[var(--radius-steamos)] px-3 py-1.5 text-xs text-steam-muted transition-colors hover:bg-white/5 hover:text-steam-text"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNote}
                        disabled={!draft.trim()}
                        className="btn-steam-green px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Save entry
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="min-h-0 flex-1">
            {notes.length === 0 ? (
              <div className="steamos-inset-panel flex flex-col items-center px-4 py-10 text-center">
                <PenLine className="mb-3 h-7 w-7 text-steam-muted/35" />
                <p className="text-sm text-steam-muted">No entries yet</p>
                <p className="text-caption mt-1 max-w-[200px]">
                  {composerOpen
                    ? "Write above and save when you're ready."
                    : "Tap Add entry to log your first note."}
                </p>
              </div>
            ) : (
              <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                <AnimatePresence initial={false} mode="popLayout">
                  {notes.map((entry) => (
                    <NoteEntry key={entry.id} entry={entry} onRemove={onRemoveNote} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
