import type { MobileEventSpeaker } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1]?.[0] ?? "?").toUpperCase();
}

export function EventSpeakersCard({ speakers }: { speakers: MobileEventSpeaker[] }) {
  const list = speakers.filter((s) => s && s.name);
  if (list.length === 0) return null;
  return (
    <SectionCard title="Diễn giả">
      <ul className="space-y-3">
        {list.map((s, i) => (
          <li key={(s.id as string) ?? i} className="flex items-start gap-3">
            {s.avatar_url ? (
              <img
                src={s.avatar_url}
                alt={s.name ?? ""}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--brand-navy-soft)] text-xs font-bold text-[color:var(--brand-navy)]">
                {initials(s.name)}
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{s.name}</p>
              {(s.title || s.organization) && (
                <p className="text-[11.5px] text-[color:var(--text-tertiary)]">
                  {[s.title, s.organization].filter(Boolean).join(" · ")}
                </p>
              )}
              {s.bio && (
                <p className="whitespace-pre-line text-[12.5px] text-[color:var(--text-secondary)]">
                  {s.bio}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}