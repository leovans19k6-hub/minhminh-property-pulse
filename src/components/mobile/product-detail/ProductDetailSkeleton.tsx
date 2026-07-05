export function ProductDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] w-full bg-[color:var(--surface-secondary)]" />
      <div className="space-y-4 p-4">
        <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface)] p-4">
          <div className="h-3 w-1/3 rounded bg-[color:var(--surface-secondary)]" />
          <div className="h-6 w-2/3 rounded bg-[color:var(--surface-secondary)]" />
          <div className="h-3 w-1/2 rounded bg-[color:var(--surface-secondary)]" />
        </div>
        <div className="h-24 rounded-2xl bg-[color:var(--brand-navy-soft)]" />
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[color:var(--surface)]" />
          ))}
        </div>
        <div className="h-28 rounded-2xl border border-border bg-[color:var(--surface)]" />
        <div className="h-28 rounded-2xl border border-border bg-[color:var(--surface)]" />
      </div>
    </div>
  );
}