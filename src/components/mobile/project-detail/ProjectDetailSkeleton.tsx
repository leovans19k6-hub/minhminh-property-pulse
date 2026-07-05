export function ProjectDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]">
        <div className="aspect-[16/9] w-full bg-muted" />
        <div className="space-y-2 p-4">
          <div className="h-3 w-1/4 rounded bg-muted" />
          <div className="h-5 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="h-12 rounded-xl bg-muted" />
      <div className="rounded-2xl border border-border bg-[color:var(--surface)] p-4">
        <div className="space-y-2">
          <div className="h-3 w-1/3 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-2.5"
        >
          <div className="h-[104px] w-[104px] shrink-0 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}