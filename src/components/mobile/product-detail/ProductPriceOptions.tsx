import type { MobileProductPriceOption } from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatVND, formatDate } from "@/utils/format";

export function ProductPriceOptions({ options }: { options: MobileProductPriceOption[] }) {
  if (options.length === 0) return null;
  return (
    <SectionCard title="Gói giá khác" padded={false}>
      <ul className="divide-y divide-border">
        {options.map((op) => (
          <li
            key={op.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">
                {op.price_name || op.price_code}
              </p>
              {(op.effective_from || op.effective_to) && (
                <p className="mt-0.5 text-[11px] text-[color:var(--text-tertiary)]">
                  {op.effective_from ? formatDate(op.effective_from) : "—"}
                  {" → "}
                  {op.effective_to ? formatDate(op.effective_to) : "—"}
                </p>
              )}
            </div>
            <p className="shrink-0 text-right text-sm font-bold text-[color:var(--brand-navy)]">
              {formatVND(op.amount)}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}