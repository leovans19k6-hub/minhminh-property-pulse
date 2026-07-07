import { Sparkles, PartyPopper, MapPinned } from "lucide-react";
import type { MobileEventDetail } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDateTime } from "@/utils/format";

const TYPE_LABEL: Record<string, string> = {
  site_tour: "Site Tour",
  sales_event: "Sự kiện bán hàng",
  training: "Đào tạo",
  opening: "Khai trương",
  customer_event: "Sự kiện khách hàng",
  other: "Sự kiện",
  event: "Sự kiện",
  launch: "Ra mắt",
};

const STATE_LABEL: Record<string, string> = {
  upcoming_registration: "Sắp mở đăng ký",
  registration_open: "Đang mở đăng ký",
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  full: "Đã hết suất",
  registration_closed: "Đã đóng đăng ký",
  completed: "Đã kết thúc",
};

export function EventIdentityCard({ detail }: { detail: MobileEventDetail }) {
  const e = detail.event;
  const Icon = e.event_type === "site_tour" ? MapPinned : PartyPopper;
  return (
    <SectionCard>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {e.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-navy)]">
              <Sparkles className="h-3 w-3" />
              Nổi bật
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-[color:var(--info-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase text-[color:var(--info)]">
            {TYPE_LABEL[e.event_type] ?? e.event_type}
          </span>
          {STATE_LABEL[e.derived_state] && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)]">
              {STATE_LABEL[e.derived_state]}
            </span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-gold)]" />
          <h2 className="min-w-0 text-base font-semibold leading-snug text-[color:var(--text-primary)]">
            {e.title}
          </h2>
        </div>
        {e.summary && (
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
            {e.summary}
          </p>
        )}
        <div className="divide-y divide-border">
          {detail.project && <InfoRow label="Dự án" value={detail.project.name} />}
          {e.start_at && (
            <InfoRow
              label="Bắt đầu"
              value={formatDateTime(e.start_at)}
            />
          )}
          {e.end_at && (
            <InfoRow label="Kết thúc" value={formatDateTime(e.end_at)} />
          )}
          {e.timezone && (
            <InfoRow label="Múi giờ" value={e.timezone} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}