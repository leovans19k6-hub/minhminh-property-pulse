import { Link } from "@tanstack/react-router";
import { CalendarDays, Ticket, MessageSquare, MapPin, Building2 } from "lucide-react";
import type { MobileRegistrationListItem } from "@/services/mobile/registrations.service";
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_DOMAIN_LABELS,
  type RegistrationStatus,
  type RegistrationDomainCode,
} from "@/lib/registrationDomain";
import { formatDateTime } from "@/utils/format";

function statusTone(s: string): string {
  if (s === "confirmed" || s === "completed")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (s === "cancelled" || s === "no_show" || s === "rejected")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
}

function domainIcon(d: string) {
  if (d === "VOUCHER") return Ticket;
  if (d === "EVENT") return CalendarDays;
  if (d === "CONSULTATION") return MessageSquare;
  return MapPin;
}

export function MobileRegistrationCard({ item }: { item: MobileRegistrationListItem }) {
  const Icon = domainIcon(item.domain);
  const status = item.status as RegistrationStatus;
  const domainLabel =
    REGISTRATION_DOMAIN_LABELS[item.domain as RegistrationDomainCode] ?? item.domain;
  const entityTitle =
    item.voucher?.title ??
    item.event?.title ??
    (item.registration_type === "consultation" ? "Yêu cầu tư vấn" : item.registration_code);
  const subtitle = item.event
    ? item.event.start_at
      ? formatDateTime(item.event.start_at)
      : null
    : item.voucher?.code
    ? `Mã voucher · ${item.voucher.code}`
    : item.product?.product_code
    ? `Sản phẩm · ${item.product.product_code}`
    : null;

  return (
    <Link
      to="/registrations/$registrationId"
      params={{ registrationId: item.id }}
      className="block rounded-2xl border border-border bg-[color:var(--surface)] p-3 shadow-[var(--shadow-xs)] transition-shadow hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-navy-soft)] text-[color:var(--brand-navy)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[color:var(--text-secondary)]">
              {domainLabel}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusTone(status)}`}
            >
              {REGISTRATION_STATUS_LABELS[status] ?? status}
            </span>
          </div>
          <p className="truncate text-[14px] font-semibold leading-tight text-[color:var(--text-primary)]">
            {entityTitle}
          </p>
          {subtitle && (
            <p className="truncate text-[12px] text-[color:var(--text-secondary)]">{subtitle}</p>
          )}
          <div className="flex items-center gap-2 text-[11px] text-[color:var(--text-tertiary)]">
            <span className="font-mono">{item.registration_code}</span>
            {item.project && (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 truncate">
                  <Building2 className="h-3 w-3" />
                  {item.project.name}
                </span>
              </>
            )}
          </div>
          <p className="text-[10.5px] text-[color:var(--text-tertiary)]">
            Đăng ký {formatDateTime(item.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}