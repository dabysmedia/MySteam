"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";

interface IgnGuideLink {
  label: string;
  url: string;
}

interface GameIgnGuidesPanelProps {
  gameName: string;
}

const VISIBLE_COUNT = 2;

function GuideLinkRow({ link }: { link: IgnGuideLink }) {
  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="steam-card-hover flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors sm:px-5"
      >
        <span className="flex min-w-0 items-center gap-2.5 text-steam-text">
          <BookOpen className="h-4 w-4 shrink-0 text-steam-accent" />
          <span className="truncate">{link.label}</span>
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-steam-muted" />
      </a>
    </li>
  );
}

export function GameIgnGuidesPanel({ gameName }: GameIgnGuidesPanelProps) {
  const [links, setLinks] = useState<IgnGuideLink[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [gameName]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/ign/guides?name=${encodeURIComponent(gameName)}`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setLinks(data.found ? data.links : []);
      } catch {
        if (!cancelled) setLinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [gameName]);

  if (loading) {
    return (
      <section className="steamos-panel overflow-hidden">
        <div className="steamos-section-header">IGN Guides</div>
        <div className="space-y-2 p-4 sm:p-5">
          <div className="h-10 skeleton rounded-[var(--radius-steamos)]" />
          <div className="h-10 skeleton rounded-[var(--radius-steamos)]" />
        </div>
      </section>
    );
  }

  if (!links || links.length === 0) return null;

  const hasMore = links.length > VISIBLE_COUNT;
  const visibleLinks = expanded ? links : links.slice(0, VISIBLE_COUNT);
  const hiddenCount = links.length - VISIBLE_COUNT;

  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header flex items-center justify-between">
        <span>IGN Guides</span>
        <a
          href={links[0]?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] font-medium normal-case text-steam-link hover:text-steam-accent-hover"
        >
          ign.com
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <ul className="divide-y divide-steam-border">
        {visibleLinks.map((link) => (
          <GuideLinkRow key={link.url} link={link} />
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="steam-card-hover flex w-full items-center justify-center gap-1.5 border-t border-steam-border px-4 py-2.5 text-xs font-medium text-steam-link transition-colors hover:text-steam-accent-hover sm:px-5"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </section>
  );
}
