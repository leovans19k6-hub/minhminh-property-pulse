import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, right, onBack }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2">
        <button
          type="button"
          onClick={onBack ?? (() => router.history.back())}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-muted"
          aria-label="Quay lại"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">{right}</div>
      </div>
    </header>
  );
}