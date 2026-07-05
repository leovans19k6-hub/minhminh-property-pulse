import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function RegisterUnavailableState({
  title,
  description,
  primaryCta,
}: {
  title: string;
  description: string;
  primaryCta?: ReactNode;
}) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-border bg-[color:var(--surface)] p-8 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--warning-soft)]">
        <AlertTriangle className="h-6 w-6 text-[color:var(--warning)]" />
      </div>
      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">{description}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {primaryCta ?? (
          <Link
            to="/"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--brand-navy)] px-4 text-sm font-semibold text-[color:var(--primary-foreground)]"
          >
            Về trang chủ
          </Link>
        )}
      </div>
    </div>
  );
}