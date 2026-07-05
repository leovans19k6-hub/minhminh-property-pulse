import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles } from "lucide-react";
import type { MobilePolicyListItem } from "@/services/mobile/policies.service";
import { formatDate } from "@/utils/format";

interface Props {
  item: MobilePolicyListItem;
  showProject?: boolean;
  productId?: string | null;
}

function effectiveRange(from: string | null, to: string | null): string {
  if (!from && !to) return "Đang áp dụng";
  if (from && !to) return `Từ ${formatDate(from)}`;
  if (!from && to) return `Đến ${formatDate(to)}`;
  return `${formatDate(from!)} – ${formatDate(to!)}`;
}

export function MobilePolicyCard({ item, showProject = false, productId }: Props) {
  return (
    <Link
      to="/policies/$policyId"
      params={{ policyId: item.id }}
      search={productId ? { productId } : undefined}
      className="group block rounded-2xl border border-border bg-[color:var(--surface)] p-3 shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0 space-y-1">
          {showProject && item.project_name && (
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {item.project_name}
            </p>
          )}
          <div className="flex items-start gap-2">
            {item.is_featured && (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-navy)]">
                <Sparkles className="h-3 w-3" />
                Nổi bật
              </span>
            )}
            <p className="min-w-0 text-sm font-semibold leading-snug text-[color:var(--text-primary)]">
              {item.title}
            </p>
          </div>
          {item.summary && (
            <p className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">{item.summary}</p>
          )}
          <p className="text-[11px] text-[color:var(--text-tertiary)]">
            {effectiveRange(item.effective_from, item.effective_to)}
            {item.registration_deadline && (
              <> · Hạn đăng ký {formatDate(item.registration_deadline)}</>
            )}
          </p>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}