import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import type {
  MobileProductPriceHistorySummary,
  MobileProductStatusHistorySummary,
} from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { ProductStatusBadge } from "./ProductStatusBadge";
import { formatVND, formatDateTime } from "@/utils/format";

export function ProductPriceHistoryCard({ s }: { s: MobileProductPriceHistorySummary }) {
  if (!s.can_view || !s.has_history) return null;
  const pct = typeof s.percentage_change === "number" ? s.percentage_change : null;
  const trend = s.trend ?? (pct == null ? "unknown" : pct > 0 ? "up" : pct < 0 ? "down" : "unchanged");
  const trendColor =
    trend === "up"
      ? "text-[color:var(--danger)]"
      : trend === "down"
        ? "text-[color:var(--success)]"
        : "text-[color:var(--text-secondary)]";
  const Icon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : ArrowRight;
  return (
    <SectionCard title="Lịch sử giá">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            {s.previous_primary_price != null && (
              <p className="text-[11px] text-[color:var(--text-tertiary)] line-through">
                {formatVND(s.previous_primary_price)}
              </p>
            )}
            {s.current_primary_price != null && (
              <p className="text-base font-bold text-[color:var(--text-primary)]">
                {formatVND(s.current_primary_price)}
              </p>
            )}
          </div>
          {pct != null && (
            <div className={"flex shrink-0 items-center gap-1 text-sm font-semibold " + trendColor}>
              <Icon className="h-4 w-4" />
              <span>
                {Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%
              </span>
            </div>
          )}
        </div>
        <p className="text-[11px] text-[color:var(--text-tertiary)]">
          {s.change_count ?? 0} lần thay đổi
          {s.latest_change_at ? ` · gần nhất ${formatDateTime(s.latest_change_at)}` : ""}
        </p>
      </div>
    </SectionCard>
  );
}

export function ProductStatusHistoryCard({ s }: { s: MobileProductStatusHistorySummary }) {
  if (!s.can_view || !s.change_count) return null;
  return (
    <SectionCard title="Lịch sử trạng thái">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {s.previous_status && <ProductStatusBadge status={s.previous_status} />}
          {s.previous_status && s.latest_status && (
            <ArrowRight className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
          )}
          {s.latest_status && <ProductStatusBadge status={s.latest_status} />}
        </div>
        <p className="text-[11px] text-[color:var(--text-tertiary)]">
          {s.change_count} lần cập nhật
          {s.latest_change_at ? ` · gần nhất ${formatDateTime(s.latest_change_at)}` : ""}
        </p>
      </div>
    </SectionCard>
  );
}