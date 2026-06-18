"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import type { SteamSearchItem } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

interface SearchAutocompleteProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: (term: string) => void;
  onQueryChange?: (term: string) => void;
  className?: string;
  variant?: "default" | "hero";
}

export function SearchAutocomplete({
  defaultValue = "",
  placeholder = "Search the Steam store...",
  autoFocus = false,
  onSubmit,
  onQueryChange,
  className = "",
  variant = "default",
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<SteamSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hero = variant === "hero";

  const fetchResults = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/steam/search?term=${encodeURIComponent(term)}&autocomplete=1`
      );
      if (!res.ok) throw new Error("search failed");
      const data = await res.json();
      const items = (data.items ?? []).slice(0, 8) as SteamSearchItem[];
      setResults(items);
      setOpen(items.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = value.trim();

    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => fetchResults(term), 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchResults]);

  useEffect(() => {
    onQueryChange?.(value);
  }, [value, onQueryChange]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToGame = (appId: number) => {
    setOpen(false);
    router.push(`/game/${appId}`);
  };

  const submitSearch = (term: string) => {
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    if (onSubmit) {
      onSubmit(q);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToGame(results[activeIndex].id);
      return;
    }
    submitSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") return;
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clearSearch = () => {
    setValue("");
    setResults([]);
    setOpen(false);
    onQueryChange?.("");
  };

  const listboxId = "steam-search-results";
  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "relative flex items-center transition-shadow",
            hero &&
              "rounded-[var(--radius-steamos-xl)] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 focus-within:ring-steam-accent/40 focus-within:shadow-[0_16px_48px_rgba(26,159,255,0.12)]"
          )}
        >
          <Search
            className={cn(
              "pointer-events-none absolute text-steam-muted",
              hero ? "left-5 h-5 w-5" : "left-3 h-4 w-4"
            )}
          />
          <input
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => results.length > 0 && value.trim().length >= 2 && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            className={cn(
              "w-full bg-steam-dark text-steam-text outline-none placeholder:text-steam-muted/60",
              hero
                ? "rounded-[calc(var(--radius-steamos-xl)-4px)] border-0 py-4 pl-14 pr-14 text-base text-steam-text-bright sm:py-4 sm:text-lg lg:py-5 lg:pl-16 lg:pr-16 lg:text-xl"
                : "rounded-sm border border-steam-border py-2.5 pl-10 pr-10 text-sm focus:border-steam-accent/50"
            )}
          />
          {loading ? (
            <Loader2
              className={cn(
                "absolute animate-spin text-steam-muted",
                hero ? "right-5 h-5 w-5" : "right-3 h-4 w-4"
              )}
            />
          ) : value ? (
            <button
              type="button"
              onClick={clearSearch}
              className={cn(
                "absolute flex items-center justify-center text-steam-muted transition-colors hover:text-steam-text",
                hero ? "right-3 h-10 w-10" : "right-2 h-7 w-7"
              )}
              aria-label="Clear search"
            >
              <X className={hero ? "h-5 w-5" : "h-4 w-4"} />
            </button>
          ) : null}
        </div>
      </form>

      {showDropdown && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 overflow-hidden border border-steam-border bg-steam-dark shadow-2xl",
            hero
              ? "mt-2 rounded-[var(--radius-steamos-lg)] ring-1 ring-white/10"
              : "mt-1 rounded-sm"
          )}
        >
          <ul id={listboxId} role="listbox" className="max-h-[min(24rem,60vh)] overflow-y-auto scrollbar-thin">
            {results.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => goToGame(item.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === activeIndex ? "bg-steam-elevated/50" : "hover:bg-steam-elevated/30"
                  }`}
                >
                  <div className="relative h-[34px] w-[52px] shrink-0 overflow-hidden rounded-sm">
                    <Image src={item.tiny_image} alt="" fill className="object-cover" sizes="52px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-steam-text-bright">{item.name}</p>
                    {item.price && (
                      <p className="text-xs text-steam-muted">
                        {formatPrice(item.price.final, item.price.currency)}
                      </p>
                    )}
                  </div>
                  {item.metascore && (
                    <span className="shrink-0 text-xs text-steam-accent">{item.metascore}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => submitSearch(value)}
            className="w-full border-t border-steam-border px-3 py-2.5 text-center text-sm text-steam-link hover:bg-steam-elevated/30"
          >
            See all results for &ldquo;{value.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

export function SearchBar({
  defaultValue = "",
  placeholder = "Search games on Steam...",
  autoFocus = false,
  onSearch,
  className = "",
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSearch?: (term: string) => void;
  className?: string;
}) {
  return (
    <SearchAutocomplete
      defaultValue={defaultValue}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onSubmit={onSearch}
      className={className}
    />
  );
}
