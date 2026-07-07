import type { MobileEventSession } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatDateTime } from "@/utils/format";

export function EventSessionsCard({ sessions }: { sessions: MobileEventSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <SectionCard title="Các phiên" padded={false}>
      <ol className="divide-y divide-border">
        {sessions.map((s) => (
          <li key={s.id} className="space-y-1 px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{s.title}</p>
            <p className="text-[11.5px] text-[color:var(--text-secondary)]">
              {formatDateTime(s.starts_at)} – {formatDateTime(s.ends_at)}
            </p>
            {s.location_text && (
              <p className="text-[11px] text-[color:var(--text-tertiary)]">{s.location_text}</p>
            )}
            {s.description && (
              <p className="whitespace-pre-line text-[12.5px] text-[color:var(--text-secondary)]">
                {s.description}
              </p>
            )}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}