import type { MobileSiteTourDetails } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";

export function EventSiteTourCard({ details }: { details: MobileSiteTourDetails }) {
  if (!details || Object.keys(details).length === 0) return null;
  const included = (details.included ?? []).filter(Boolean);
  const requirements = (details.requirements ?? []).filter(Boolean);
  return (
    <SectionCard title="Thông tin Site Tour">
      <div className="space-y-3">
        <div className="divide-y divide-border">
          {details.meeting_point && (
            <InfoRow label="Điểm tập trung" value={details.meeting_point} />
          )}
          {details.transportation && (
            <InfoRow label="Phương tiện" value={details.transportation} />
          )}
          {details.departure_time && (
            <InfoRow label="Giờ khởi hành" value={details.departure_time} />
          )}
          {details.return_time && (
            <InfoRow label="Giờ về" value={details.return_time} />
          )}
        </div>
        {included.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Bao gồm
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-[12.5px] text-[color:var(--text-secondary)]">
              {included.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        )}
        {requirements.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Yêu cầu
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-[12.5px] text-[color:var(--text-secondary)]">
              {requirements.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </div>
        )}
        {details.contact_note && (
          <p className="rounded-xl bg-[color:var(--info-soft)] px-3 py-2 text-[12.5px] text-[color:var(--info)]">
            {details.contact_note}
          </p>
        )}
      </div>
    </SectionCard>
  );
}