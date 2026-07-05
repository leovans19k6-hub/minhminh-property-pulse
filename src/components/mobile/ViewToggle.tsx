import { LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid";

export function useViewMode(storageKey: string, initial: ViewMode = "list") {
  const [mode, setMode] = useState<ViewMode>(initial);
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(storageKey);
      if (v === "list" || v === "grid") setMode(v);
    } catch {
      /* noop */
    }
  }, [storageKey]);
  const update = (v: ViewMode) => {
    setMode(v);
    try {
      window.localStorage.setItem(storageKey, v);
    } catch {
      /* noop */
    }
  };
  return [mode, update] as const;
}

export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  className?: string;
}) {
  const btn = (v: ViewMode, Icon: typeof List, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg transition-colors",
        value === v
          ? "bg-[color:var(--brand-navy)] text-[color:var(--primary-foreground)] shadow-sm"
          : "text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-border bg-[color:var(--surface)] p-1",
        className,
      )}
    >
      {btn("list", List, "Xem dạng danh sách")}
      {btn("grid", LayoutGrid, "Xem dạng lưới")}
    </div>
  );
}