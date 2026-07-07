import { ExternalLink, MapPin, Video } from "lucide-react";
import type { MobileEventDetail } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";

const LOC_LABEL: Record<string, string> = {
  physical: "Địa điểm trực tiếp",
  online: "Trực tuyến",
  hybrid: "Kết hợp",
};

function mapsUrl(e: MobileEventDetail["event"]): string | null {
  if (e.latitude != null && e.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`;
  }
  const q = [e.location_name, e.address_text].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

export function EventLocationCard({ detail }: { detail: MobileEventDetail }) {
  const e = detail.event;
  if (!e.location_name && !e.address_text && !e.meeting_url && e.location_type === "physical")
    return null;
  const url = mapsUrl(e);
  return (
    <SectionCard title={LOC_LABEL[e.location_type] ?? "Địa điểm"}>
      <div className="space-y-2 text-[13px]">
        {e.location_name && (
          <p className="flex items-start gap-2 font-semibold text-[color:var(--text-primary)]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-navy)]" />
            {e.location_name}
          </p>
        )}
        {e.address_text && (
          <p className="text-[color:var(--text-secondary)]">{e.address_text}</p>
        )}
        {e.location_notes && (
          <p className="text-xs text-[color:var(--text-tertiary)]">{e.location_notes}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-[color:var(--surface)] px-3 text-xs font-semibold text-[color:var(--brand-navy)]"
            >
              <MapPin className="h-3.5 w-3.5" />
              Xem bản đồ
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {e.meeting_url && (
            <a
              href={e.meeting_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[color:var(--brand-navy)] px-3 text-xs font-semibold text-white"
            >
              <Video className="h-3.5 w-3.5" />
              Vào phòng họp
            </a>
          )}
        </div>
      </div>
    </SectionCard>
  );
}