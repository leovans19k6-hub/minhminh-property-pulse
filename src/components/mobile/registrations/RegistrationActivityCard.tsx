import type { MobileRegistrationDetail } from "@/services/mobile/registrations.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { ACTIVITY_TYPE_LABELS } from "@/lib/registrationDomain";
import { formatDateTime } from "@/utils/format";

export function RegistrationActivityCard({ detail }: { detail: MobileRegistrationDetail }) {
  const items = detail.activities;
  return (
    <SectionCard title="Lịch sử xử lý">
      {items.length === 0 ? (
        <p className="text-[12.5px] text-[color:var(--text-tertiary)]">Chưa có cập nhật nào.</p>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span
                className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full bg-[color:var(--brand-navy)]"
                aria-hidden
              />
              <p className="text-[13px] font-medium text-[color:var(--text-primary)]">
                {a.title || ACTIVITY_TYPE_LABELS[a.activity_type] || a.activity_type}
              </p>
              <p className="text-[11px] text-[color:var(--text-tertiary)]">
                {ACTIVITY_TYPE_LABELS[a.activity_type] ?? a.activity_type} ·{" "}
                {formatDateTime(a.occurred_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}