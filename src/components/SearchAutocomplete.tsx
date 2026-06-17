"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import type { SteamSearchItem } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

interface SearchAutocompleteProps {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit?: (term: string) => void;
  className?: string;
}

export function SearchAutocomplete({
  defaultValue = "",
  placeholder = "Search the Steam store...",
  autoFocus = false,
  onSubmit,
  className = "",
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<SteamSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/steam/search?term=${encodeURIComponent(term)}`);
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

  const listboxId = "steam-search-results";

  const showDropdown = open && value.trim().length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-steam-muted" />
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
            className="w-full rounded-sm border border-steam-border bg-steam-dark py-2.5 pl-10 pr-10 text-sm text-steam-text placeholder:text-steam-muted/60 outline-none focus:border-steam-accent/50"
          />
          {loading ? (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-steam-muted" />
          ) : value ? (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setResults([]);
                setOpen(false);
              }}
              className="absolute right-2 flex h-7 w-7 items-center justify-center text-steam-muted hover:text-steam-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </form>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-sm border border-steam-border bg-steam-dark shadow-2xl">
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
            className="w-full border-t border-steam-border px-3 py-2 text-center text-xs text-steam-link hover:bg-steam-elevated/30"
          >
            See all results for &ldquo;{value.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}

// Simple search bar without autocomplete (for empty states)
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
