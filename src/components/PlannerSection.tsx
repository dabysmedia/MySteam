import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface PlannerSectionProps {
  title: string;
  subtitle?: string;
  count?: number;
  href?: string;
  actionLabel?: string;
  children: React.ReactNode;
  empty?: React.ReactNode;
  isEmpty?: boolean;
}

export function PlannerSection({
  title,
  subtitle,
  count,
  href,
  actionLabel = "See all",
  children,
  empty,
  isEmpty,
}: PlannerSectionProps) {
  return (
    <section className="steamos-panel overflow-hidden">
      <div className="steamos-section-header flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span>{title}</span>
          {count !== undefined && (
            <span className="steamos-chip steamos-chip-muted px-2.5 py-0.5 text-xs sm:px-2 sm:text-[10px]">
              {count}
            </span>
          )}
        </div>
        {href && !isEmpty && (
          <Link
            href={href}
            className="flex items-center gap-1 text-xs font-medium normal-case text-steam-link hover:text-steam-accent-hover sm:text-[10px] sm:font-normal"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />
          </Link>
        )}
      </div>
      {subtitle && (
        <p className="border-b border-steam-border px-5 py-2.5 text-sm text-steam-muted sm:px-4 sm:py-2 sm:text-xs">
          {subtitle}
        </p>
      )}
      {isEmpty ? (
        <div className="px-5 py-10 text-center sm:px-4 sm:py-8">{empty}</div>
      ) : (
        <div>{children}</div>
      )}
    </section>
  );
}
