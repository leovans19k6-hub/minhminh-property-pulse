import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface QuickActionItem {
  to: string;
  icon: LucideIcon;
  label: string;
  subtitle?: string;
}

export function HomeQuickActions({ items }: { items: QuickActionItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.label}
            to={a.to}
            className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-border bg-[color:var(--surface)] p-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)] sm:flex-col sm:items-start"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-navy-soft)] text-[color:var(--brand-navy)]">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-[color:var(--text-primary)]">
                {a.label}
              </p>
              {a.subtitle && (
                <p className="truncate text-[11px] text-[color:var(--text-tertiary)]">
                  {a.subtitle}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}