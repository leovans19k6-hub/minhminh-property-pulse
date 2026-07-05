import { SectionCard } from "@/components/mobile/SectionCard";
import type { MobilePolicyApplicability } from "@/services/mobile/policies.service";

interface Props {
  applicability: MobilePolicyApplicability;
  hasProductContext: boolean;
}

export function PolicyApplicabilityCard({ applicability, hasProductContext }: Props) {
  const scopeLabel =
    applicability.scope === "project_wide"
      ? "Áp dụng toàn dự án"
      : applicability.scope === "product_types"
        ? "Áp dụng theo loại sản phẩm"
        : applicability.scope === "products"
          ? "Áp dụng cho sản phẩm chỉ định"
          : "Áp dụng có điều kiện";

  return (
    <SectionCard title="Đối tượng áp dụng">
      <div className="space-y-3">
        <p className="text-sm font-medium text-[color:var(--text-primary)]">{scopeLabel}</p>

        {hasProductContext && applicability.applies_to_current_product !== null && (
          <p
            className={
              applicability.applies_to_current_product
                ? "rounded-lg bg-[color:var(--success-soft,rgba(16,185,129,0.1))] px-3 py-2 text-[12.5px] font-semibold text-[color:var(--text-primary)]"
                : "rounded-lg bg-[color:var(--warning-soft,rgba(245,158,11,0.12))] px-3 py-2 text-[12.5px] font-semibold text-[color:var(--text-primary)]"
            }
          >
            {applicability.applies_to_current_product
              ? "Áp dụng cho sản phẩm bạn đang xem"
              : "Không áp dụng cho sản phẩm bạn đang xem"}
          </p>
        )}

        {applicability.product_types.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Loại sản phẩm
            </p>
            <div className="flex flex-wrap gap-1.5">
              {applicability.product_types.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex rounded-full border border-border bg-[color:var(--surface)] px-2.5 py-1 text-[11.5px] font-medium text-[color:var(--text-primary)]"
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {applicability.products.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Sản phẩm chỉ định
            </p>
            <ul className="space-y-1 text-[13px] text-[color:var(--text-secondary)]">
              {applicability.products.slice(0, 20).map((p) => (
                <li key={p.id} className="truncate">
                  <span className="font-mono text-[12px] text-[color:var(--text-primary)]">
                    {p.product_code}
                  </span>
                  {p.product_name ? ` — ${p.product_name}` : ""}
                </li>
              ))}
              {applicability.products.length > 20 && (
                <li className="text-[11px] text-[color:var(--text-tertiary)]">
                  và {applicability.products.length - 20} sản phẩm khác
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}