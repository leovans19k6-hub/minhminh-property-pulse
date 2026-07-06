import { Link } from "@tanstack/react-router";
import { ChevronRight, Sparkles, Ticket } from "lucide-react";
import type { MobileVoucherListItem } from "@/services/mobile/vouchers.service";
import { formatDate } from "@/utils/format";

interface Props {
  item: MobileVoucherListItem;
  showProject?: boolean;
  productId?: string | null;
  policyId?: string | null;
}

const STATE_LABEL: Record<string, string> = {
  open: "Đang mở",
  upcoming_registration: "Sắp mở đăng ký",
  upcoming_validity: "Sắp hiệu lực",
  registration_closed: "Đã đóng đăng ký",
  full: "Hết suất",
  valid: "Đang áp dụng",
};

function stateTone(state: string): string {
  if (state === "open" || state === "valid")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (state.startsWith("upcoming"))
    return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
  if (state === "full" || state === "registration_closed")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-muted text-[color:var(--text-secondary)]";
}

function capacityText(item: MobileVoucherListItem): string | null {
  if (item.is_unlimited) return "Không giới hạn";
  if (item.capacity_remaining == null) return null;
  if (item.capacity_remaining <= 0) return "Đã hết suất";
  return `Còn ${item.capacity_remaining} suất`;
}

export function MobileVoucherCard({ item, showProject, productId, policyId }: Props) {
  const state = item.derived_state;
  const cap = capacityText(item);
  return (
    <Link
      to="/vouchers/$voucherId"
      params={{ voucherId: item.id }}
      search={
        productId || policyId
          ? { productId: productId ?? undefined, policyId: policyId ?? undefined }
          : undefined
      }
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
          {item.code && (
            <p className="font-mono text-[11px] uppercase text-[color:var(--text-secondary)]">
              {item.code}
            </p>
          )}
          {item.primary_benefit_summary && (
            <p className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[color:var(--brand-navy)]">
              <Ticket className="h-3.5 w-3.5" aria-hidden />
              {item.primary_benefit_summary}
            </p>
          )}
          {item.summary && (
            <p className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">{item.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {STATE_LABEL[state] && (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${stateTone(state)}`}
              >
                {STATE_LABEL[state]}
              </span>
            )}
            {cap && (
              <span className="text-[11px] text-[color:var(--text-tertiary)]">{cap}</span>
            )}
            {item.registration_deadline && (
              <span className="text-[11px] text-[color:var(--text-tertiary)]">
                · Hạn {formatDate(item.registration_deadline)}
              </span>
            )}
          </div>
        </div>
        <ChevronRight
          className="mt-1 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}