export function InventoryListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-2.5"
        >
          <div className="h-[104px] w-[104px] shrink-0 rounded-xl bg-muted sm:h-[120px] sm:w-[120px]" />
          <div className="flex flex-1 flex-col justify-between py-1">
            <div className="space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="flex gap-2 pt-1">
                <div className="h-3 w-14 rounded bg-muted" />
                <div className="h-3 w-14 rounded bg-muted" />
                <div className="h-3 w-14 rounded bg-muted" />
              </div>
            </div>
            <div className="h-4 w-24 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}