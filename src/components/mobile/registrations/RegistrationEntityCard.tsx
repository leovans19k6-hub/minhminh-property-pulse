import { Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, MapPin, Ticket } from "lucide-react";
import type { MobileRegistrationDetail } from "@/services/mobile/registrations.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDateTime, formatDate } from "@/utils/format";

export function RegistrationEntityCard({ detail }: { detail: MobileRegistrationDetail }) {
  if (detail.voucher) {
    const v = detail.voucher;
    return (
      <SectionCard title="Voucher">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-navy-soft)] text-[color:var(--brand-navy)]">
              <Ticket className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[color:var(--text-primary)]">
                {v.title}
              </p>
              {v.code && (
                <p className="font-mono text-[11px] uppercase text-[color:var(--text-tertiary)]">
                  {v.code}
                </p>
              )}
            </div>
          </div>
          {v.summary && (
            <p className="text-[12.5px] text-[color:var(--text-secondary)]">{v.summary}</p>
          )}
        </div>
        <div className="mt-3 divide-y divide-border">
          {v.valid_from && <InfoRow label="Hiệu lực từ" value={formatDate(v.valid_from)} />}
          {v.valid_to && <InfoRow label="Đến ngày" value={formatDate(v.valid_to)} />}
        </div>
        <Link
          to="/vouchers/$voucherId"
          params={{ voucherId: v.id }}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--brand-navy)]"
        >
          Xem chi tiết voucher <ExternalLink className="h-3 w-3" />
        </Link>
      </SectionCard>
    );
  }

  if (detail.event) {
    const e = detail.event;
    return (
      <SectionCard title={e.event_type === "site_tour" ? "Site tour" : "Sự kiện"}>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--brand-navy-soft)] text-[color:var(--brand-navy)]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-[color:var(--text-primary)]">
                {e.title}
              </p>
              {e.location_name && (
                <p className="flex items-center gap-1 text-[11px] text-[color:var(--text-tertiary)]">
                  <MapPin className="h-3 w-3" /> {e.location_name}
                </p>
              )}
            </div>
          </div>
          {e.summary && (
            <p className="text-[12.5px] text-[color:var(--text-secondary)]">{e.summary}</p>
          )}
        </div>
        <div className="mt-3 divide-y divide-border">
          {e.start_at && <InfoRow label="Bắt đầu" value={formatDateTime(e.start_at)} />}
          {e.end_at && <InfoRow label="Kết thúc" value={formatDateTime(e.end_at)} />}
          {e.address_text && <InfoRow label="Địa chỉ" value={e.address_text} />}
        </div>
        <Link
          to="/events/$eventId"
          params={{ eventId: e.id }}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-[color:var(--brand-navy)]"
        >
          Xem chi tiết sự kiện <ExternalLink className="h-3 w-3" />
        </Link>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Nội dung đăng ký">
      <p className="text-[12.5px] text-[color:var(--text-secondary)]">
        Yêu cầu tư vấn của bạn đã được gửi cho đội ngũ phụ trách. Bộ phận kinh doanh sẽ liên hệ trong thời gian sớm nhất.
      </p>
    </SectionCard>
  );
}