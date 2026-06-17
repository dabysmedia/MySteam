export function SkeletonCard({ variant = "grid" }: { variant?: "grid" | "row" }) {
  if (variant === "row") {
    return (
      <div className="flex gap-3 border-b border-steam-border px-4 py-3">
        <div className="h-[45px] w-[82px] shrink-0 skeleton rounded-sm" />
        <div className="flex flex-1 flex-col justify-center gap-2">
          <div className="h-4 w-1/2 skeleton rounded-sm" />
          <div className="h-3 w-1/3 skeleton rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-sm border border-steam-border">
      <div className="aspect-[16/10] skeleton" />
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 skeleton rounded-sm" />
      </div>
    </div>
  );
}

export function SkeletonList() {
  return <SkeletonCard variant="row" />;
}
