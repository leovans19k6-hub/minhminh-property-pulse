import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function SectionCard({ title, action, children, className, padded = true }: Props) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3">
          {title && (
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              {title}
            </h3>
          )}
          {action}
        </header>
      )}
      <div className={cn(padded ? "px-4 py-3" : undefined)}>{children}</div>
    </section>
  );
}