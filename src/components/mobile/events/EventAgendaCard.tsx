import type { MobileEventAgendaItem } from "@/services/mobile/events.service";
import { SectionCard } from "@/components/mobile/SectionCard";

export function EventAgendaCard({ items }: { items: MobileEventAgendaItem[] }) {
  const list = items.filter((i) => i && (i.title || i.description || i.time_label));
  if (list.length === 0) return null;
  return (
    <SectionCard title="Chương trình" padded={false}>
      <ol className="divide-y divide-border">
        {list.map((it, i) => (
          <li key={(it.id as string) ?? i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3">
            <span className="rounded-md bg-[color:var(--brand-navy-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--brand-navy)]">
              {it.time_label ?? `#${i + 1}`}
            </span>
            <div className="min-w-0 space-y-0.5">
              {it.title && (
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{it.title}</p>
              )}
              {it.description && (
                <p className="whitespace-pre-line text-[12.5px] text-[color:var(--text-secondary)]">
                  {it.description}
                </p>
              )}
              {it.location && (
                <p className="text-[11px] text-[color:var(--text-tertiary)]">{it.location}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}