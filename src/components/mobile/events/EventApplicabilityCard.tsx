import { Check, X } from "lucide-react";
import type { MobileEventApplicability } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";

const SCOPE_LABEL: Record<MobileEventApplicability["scope"], string> = {
  project_wide: "Toàn dự án",
  product_types: "Theo loại sản phẩm",
  specific_products: "Sản phẩm chỉ định",
  sales_policies: "Theo chính sách bán hàng",
  vouchers: "Theo voucher",
  mixed: "Kết hợp",
};

export function EventApplicabilityCard({
  applicability: a,
  hasProductContext,
  hasPolicyContext,
}: {
  applicability: MobileEventApplicability;
  hasProductContext?: boolean;
  hasPolicyContext?: boolean;
}) {
  return (
    <SectionCard title="Phạm vi áp dụng">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[color:var(--text-primary)]">
          {SCOPE_LABEL[a.scope]}
        </p>
        {hasProductContext && a.applies_to_current_product != null && (
          <p
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
              a.applies_to_current_product
                ? "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]"
                : "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]"
            }`}
          >
            {a.applies_to_current_product ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {a.applies_to_current_product
              ? "Áp dụng cho sản phẩm hiện tại"
              : "Không áp dụng cho sản phẩm hiện tại"}
          </p>
        )}
        {hasPolicyContext && a.applies_to_current_policy != null && (
          <p
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${
              a.applies_to_current_policy
                ? "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]"
                : "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]"
            }`}
          >
            {a.applies_to_current_policy ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {a.applies_to_current_policy
              ? "Áp dụng cho chính sách hiện tại"
              : "Không áp dụng cho chính sách hiện tại"}
          </p>
        )}
        {a.product_types.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Loại sản phẩm
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.product_types.map((pt) => (
                <span key={pt.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-[color:var(--text-primary)]">
                  {pt.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {a.products.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Sản phẩm cụ thể
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.products.slice(0, 20).map((p) => (
                <span key={p.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-[color:var(--text-primary)]">
                  {p.product_code}
                </span>
              ))}
              {a.products.length > 20 && (
                <span className="text-[11px] text-[color:var(--text-tertiary)]">
                  +{a.products.length - 20} khác
                </span>
              )}
            </div>
          </div>
        )}
        {a.policies.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Chính sách
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.policies.map((p) => (
                <span key={p.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {p.title}
                </span>
              ))}
            </div>
          </div>
        )}
        {a.vouchers.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Voucher
            </p>
            <div className="flex flex-wrap gap-1.5">
              {a.vouchers.map((v) => (
                <span key={v.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {v.title}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}