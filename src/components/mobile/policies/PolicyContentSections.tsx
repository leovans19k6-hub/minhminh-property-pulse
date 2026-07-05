import { SectionCard } from "@/components/mobile/SectionCard";
import type { MobilePolicyContentSection } from "@/services/mobile/policies.service";

interface Props {
  sections: MobilePolicyContentSection[];
  summary?: string | null;
}

function nonEmpty(s: MobilePolicyContentSection): boolean {
  return !!(
    s.title ||
    s.subtitle ||
    s.content ||
    s.note ||
    s.highlight ||
    (Array.isArray(s.items) && s.items.length > 0)
  );
}

export function PolicyContentSections({ sections, summary }: Props) {
  const filtered = (sections ?? []).filter(nonEmpty);
  if (!summary && filtered.length === 0) return null;
  return (
    <SectionCard title="Nội dung">
      <div className="space-y-4">
        {summary && (
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
            {summary}
          </p>
        )}
        {filtered.map((s, i) => (
          <div key={s.id ?? i} className="space-y-1.5">
            {s.title && (
              <h4 className="text-sm font-semibold text-[color:var(--text-primary)]">
                {s.title}
              </h4>
            )}
            {s.subtitle && (
              <p className="text-[12px] font-medium text-[color:var(--text-secondary)]">
                {s.subtitle}
              </p>
            )}
            {s.content && (
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                {s.content}
              </p>
            )}
            {Array.isArray(s.items) && s.items.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
                {s.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
            {s.highlight && (
              <p className="rounded-lg bg-[color:var(--brand-gold-soft)] px-3 py-2 text-[12.5px] font-medium text-[color:var(--brand-navy)]">
                {s.highlight}
              </p>
            )}
            {s.note && (
              <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-[color:var(--text-tertiary)]">
                {s.note}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}