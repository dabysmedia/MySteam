import type { BacklogStatus, BacklogGame } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

export function formatPrice(cents?: number, currency = "USD"): string {
  if (cents === undefined || cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function getGameArt(
  game: Pick<BacklogGame, "featuredArt" | "backgroundImage" | "headerImage">
): string {
  return (
    game.featuredArt ||
    game.headerImage ||
    game.backgroundImage ||
    game.headerImage
  );
}

/** Cover thumbnail for list rows — always the Steam header/capsule art */
export function getRowCoverArt(game: Pick<BacklogGame, "headerImage">): string {
  return game.headerImage;
}

/** Background bleed for list rows — screenshot preferred, not the cover */
export function getRowBleedArt(
  game: Pick<BacklogGame, "screenshotImage" | "backgroundImage" | "headerImage">
): string | undefined {
  const bleed = game.screenshotImage ?? game.backgroundImage;
  if (!bleed || bleed === game.headerImage) return undefined;
  return bleed;
}

export function statusBadgeClass(status: BacklogStatus): string {
  const colors: Record<BacklogStatus, string> = {
    wishlist: "bg-[#66c0f4]/15 text-[#66c0f4] border-[#66c0f4]/30",
    playing: "bg-[#a4d007]/15 text-[#a4d007] border-[#a4d007]/30",
    completed: "bg-[#5ba32b]/15 text-[#5ba32b] border-[#5ba32b]/30",
    dropped: "bg-[#8f98a0]/15 text-[#8f98a0] border-[#8f98a0]/30",
  };
  return colors[status];
}

export { STATUS_COLORS, STATUS_LABELS };
