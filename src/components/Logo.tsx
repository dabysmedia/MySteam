import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <Image
        src="/steam-logo.svg"
        alt="Steam"
        width={32}
        height={32}
        className="h-8 w-8 sm:h-8 sm:w-8"
        priority
      />
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tracking-tight text-steam-text-bright sm:text-lg">
          steam
        </span>
        <span className="hidden text-xs text-steam-muted sm:inline">planner</span>
      </div>
    </Link>
  );
}
