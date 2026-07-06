import { Check } from "lucide-react";
import type { MobileVoucherCondition } from "@/services/mobile/vouchers.service";
import { SectionCard } from "@/components/mobile/SectionCard";

export function VoucherConditionsCard({ conditions }: { conditions: MobileVoucherCondition[] }) {
  const sorted = [...conditions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  if (sorted.length === 0) return null;
  return (
    <SectionCard title="Điều kiện áp dụng">
      <ul className="space-y-2.5">
        {sorted.map((c, i) => (
          <li key={(c.id as string) ?? i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-navy)]" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-[color:var(--text-primary)]">
                {c.title ?? "Điều kiện"}
                {c.required && (
                  <span className="ml-1 text-[10px] font-semibold uppercase text-[color:var(--danger,#dc2626)]">
                    Bắt buộc
                  </span>
                )}
              </p>
              {c.description && (
                <p className="text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                  {c.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}