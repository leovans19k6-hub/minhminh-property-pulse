import type { MobileRegistrationDetail } from "@/services/mobile/registrations.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import {
  REGISTRATION_DOMAIN_LABELS,
  REGISTRATION_STATUS_LABELS,
  type RegistrationDomainCode,
  type RegistrationStatus,
} from "@/lib/registrationDomain";
import { formatDateTime } from "@/utils/format";

function statusTone(s: string): string {
  if (s === "confirmed" || s === "completed")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (s === "cancelled" || s === "no_show" || s === "rejected")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
}

export function RegistrationIdentityCard({ detail }: { detail: MobileRegistrationDetail }) {
  const r = detail.registration;
  const domainLabel =
    REGISTRATION_DOMAIN_LABELS[r.domain as RegistrationDomainCode] ?? r.domain;
  const statusLabel =
    REGISTRATION_STATUS_LABELS[r.status as RegistrationStatus] ?? r.status;
  const title =
    detail.voucher?.title ??
    detail.event?.title ??
    (r.registration_type === "consultation" ? "Yêu cầu tư vấn" : r.registration_code);

  return (
    <SectionCard>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
            {domainLabel}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(r.status)}`}
          >
            {statusLabel}
          </span>
        </div>
        <h2 className="text-[17px] font-semibold leading-tight text-[color:var(--text-primary)]">
          {title}
        </h2>
        <p className="font-mono text-[11px] uppercase text-[color:var(--text-secondary)]">
          {r.registration_code}
        </p>
      </div>
      <div className="mt-3 divide-y divide-border">
        <InfoRow label="Đăng ký" value={formatDateTime(r.created_at)} />
        {r.updated_at && r.updated_at !== r.created_at && (
          <InfoRow label="Cập nhật" value={formatDateTime(r.updated_at)} />
        )}
        {detail.project && <InfoRow label="Dự án" value={detail.project.name} />}
        {detail.product && (
          <InfoRow
            label="Sản phẩm"
            value={detail.product.product_name ?? detail.product.product_code}
          />
        )}
        {r.note && <InfoRow label="Ghi chú" value={r.note} />}
      </div>
    </SectionCard>
  );
}