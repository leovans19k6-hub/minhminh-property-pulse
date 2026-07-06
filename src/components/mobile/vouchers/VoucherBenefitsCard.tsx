import { Sparkles } from "lucide-react";
import type { MobileVoucherBenefit } from "@/services/mobile/vouchers.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatVND } from "@/utils/format";

const TYPE_LABEL: Record<string, string> = {
  percentage: "%",
  fixed_amount: "đ",
  gift: "Quà",
  service: "Dịch vụ",
  other: "Khác",
};

function benefitValue(b: MobileVoucherBenefit): string | null {
  if (b.value == null) return null;
  if (b.value_type === "percentage") return `${b.value}%`;
  if (b.value_type === "fixed_amount") return `${formatVND(Number(b.value))} đ`;
  return b.unit ? `${b.value} ${b.unit}` : String(b.value);
}

function normalize(list: MobileVoucherBenefit[]): MobileVoucherBenefit[] {
  return [...list].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
}

export function VoucherPrimaryBenefitCard({
  benefits,
  fallback,
}: {
  benefits: MobileVoucherBenefit[];
  fallback?: string | null;
}) {
  const sorted = normalize(benefits);
  const b = sorted.find((x) => x.highlight) ?? sorted[0];
  const value = b ? benefitValue(b) : null;
  const title = b?.title ?? fallback;
  if (!title && !value) return null;
  return (
    <section className="rounded-2xl bg-[color:var(--brand-navy)] p-4 text-white shadow-[var(--shadow-sm)]">
      <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">
        Quyền lợi chính
      </p>
      <p className="mt-1 text-[22px] font-bold leading-tight tracking-tight">
        {value ?? title}
      </p>
      {value && title && <p className="mt-0.5 text-sm opacity-90">{title}</p>}
      {b?.description && (
        <p className="mt-1 text-[13px] leading-relaxed opacity-85">{b.description}</p>
      )}
    </section>
  );
}

export function VoucherBenefitsCard({ benefits }: { benefits: MobileVoucherBenefit[] }) {
  const sorted = normalize(benefits);
  if (sorted.length === 0) return null;
  return (
    <SectionCard title="Quyền lợi" padded={false}>
      <ul className="divide-y divide-border">
        {sorted.map((b, i) => {
          const value = benefitValue(b);
          return (
            <li key={(b.id as string) ?? i} className="px-4 py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    {b.highlight && (
                      <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-gold)]" />
                    )}
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {b.title ?? "Quyền lợi"}
                    </p>
                  </div>
                  {b.description && (
                    <p className="text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                      {b.description}
                    </p>
                  )}
                  {b.value_type && (
                    <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">
                      {TYPE_LABEL[b.value_type] ?? b.value_type}
                    </p>
                  )}
                </div>
                {value && (
                  <p className="shrink-0 text-right text-sm font-bold text-[color:var(--brand-navy)]">
                    {value}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}