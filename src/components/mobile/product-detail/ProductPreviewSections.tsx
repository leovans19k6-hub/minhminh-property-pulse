import { Calendar, ChevronRight, MapPin, Sparkles, Ticket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type {
  MobileEventPreview,
  MobilePolicyPreview,
  MobileVoucherPreview,
} from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatVND, formatDate, formatDateTime } from "@/utils/format";

export function PoliciesPreview({
  items,
  productId,
}: {
  items: MobilePolicyPreview[];
  productId?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <SectionCard title="Chính sách áp dụng" padded={false}>
      <ul className="divide-y divide-border">
        {items.map((x) => (
          <li key={x.id}>
            <Link
              to="/policies/$policyId"
              params={{ policyId: x.id }}
              search={productId ? { productId } : undefined}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-start gap-2">
              {x.is_featured && (
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-navy)]">
                  <Sparkles className="h-3 w-3" />
                  Nổi bật
                </span>
              )}
              <p className="min-w-0 text-sm font-semibold text-[color:var(--text-primary)]">
                {x.title}
              </p>
            </div>
            {x.summary && (
              <p className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">{x.summary}</p>
            )}
            {(x.effective_from || x.effective_to) && (
              <p className="text-[11px] text-[color:var(--text-tertiary)]">
                {x.effective_from ? `Từ ${formatDate(x.effective_from)}` : ""}
                {x.effective_from && x.effective_to ? " · " : ""}
                {x.effective_to ? `đến ${formatDate(x.effective_to)}` : ""}
              </p>
            )}
              </div>
              <ChevronRight
                className="mt-1 h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function VouchersPreview({
  items,
  productId,
}: {
  items: MobileVoucherPreview[];
  productId?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <SectionCard title="Ưu đãi áp dụng" padded={false}>
      <ul className="divide-y divide-border">
        {items.map((v) => {
          const value =
            v.value_amount != null
              ? formatVND(v.value_amount)
              : v.value_percent != null
                ? `${v.value_percent}%`
                : null;
          return (
            <li key={v.id}>
              <Link
                to="/vouchers/$voucherId"
                params={{ voucherId: v.id }}
                search={productId ? { productId } : undefined}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-3.5 w-3.5 shrink-0 text-[color:var(--brand-gold)]" />
                    <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--text-primary)]">
                      {v.title}
                    </p>
                  </div>
                  {v.code && (
                    <p className="text-[11px] font-mono uppercase text-[color:var(--text-secondary)]">
                      {v.code}
                    </p>
                  )}
                  {v.summary && (
                    <p className="line-clamp-2 text-xs text-[color:var(--text-secondary)]">
                      {v.summary}
                    </p>
                  )}
                  {(v.effective_from || v.effective_to) && (
                    <p className="text-[11px] text-[color:var(--text-tertiary)]">
                      {v.effective_from ? `Từ ${formatDate(v.effective_from)}` : ""}
                      {v.effective_from && v.effective_to ? " · " : ""}
                      {v.effective_to ? `đến ${formatDate(v.effective_to)}` : ""}
                    </p>
                  )}
                  {v.quantity != null && (
                    <p className="text-[11px] text-[color:var(--text-tertiary)]">
                      Còn {Math.max(v.quantity - (v.registered_count ?? 0), 0)}/{v.quantity} suất
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  {value && (
                    <p className="text-right text-base font-bold text-[color:var(--brand-navy)]">
                      {value}
                    </p>
                  )}
                  <ChevronRight
                    className="mt-1 h-4 w-4 text-[color:var(--text-tertiary)]"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

export function EventsPreview({ items }: { items: MobileEventPreview[] }) {
  if (items.length === 0) return null;
  return (
    <SectionCard title="Sự kiện sắp diễn ra" padded={false}>
      <ul className="divide-y divide-border">
        {items.map((e) => (
          <li key={e.id} className="space-y-1 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--info)]">
                <Calendar className="h-3 w-3" />
                {e.event_type === "site_tour" ? "Tham quan" : "Sự kiện"}
              </span>
              <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--text-primary)]">
                {e.title}
              </p>
            </div>
            {e.start_at && (
              <p className="text-xs text-[color:var(--text-secondary)]">
                {formatDateTime(e.start_at)}
              </p>
            )}
            {e.location_name && (
              <p className="flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
                <MapPin className="h-3 w-3" />
                {e.location_name}
              </p>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}