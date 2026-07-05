export function NotificationsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5 px-4 py-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-3"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}