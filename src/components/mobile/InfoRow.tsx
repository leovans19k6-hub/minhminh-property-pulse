import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  label: ReactNode;
  value: ReactNode;
  className?: string;
  align?: "row" | "stack";
}

export function InfoRow({ label, value, className, align = "row" }: Props) {
  if (align === "stack") {
    return (
      <div className={cn("min-w-0 space-y-0.5", className)}>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
          {label}
        </p>
        <p className="text-sm font-medium text-[color:var(--text-primary)]">{value}</p>
      </div>
    );
  }
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-3 py-2", className)}>
      <span className="shrink-0 text-xs text-[color:var(--text-secondary)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-[color:var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}