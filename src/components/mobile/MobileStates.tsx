import { Loader2, AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MobileListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card">
          <div className="aspect-[16/10] bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MobileQueryErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center">
      <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
      <p className="mt-2 text-sm font-medium">{message ?? "Có lỗi khi tải dữ liệu."}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-3">
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function MobileEmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border p-8 text-center">
      <Inbox className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function MobileInlineLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}