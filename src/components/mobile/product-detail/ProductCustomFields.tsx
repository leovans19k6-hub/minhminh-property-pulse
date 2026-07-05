import { ExternalLink } from "lucide-react";
import type { MobileProductCustomField } from "@/services/mobile/products.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatDate, formatDateTime } from "@/utils/format";

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function renderValue(f: MobileProductCustomField) {
  const v = f.value;
  if (f.data_type === "long_text" && typeof v === "string") {
    return (
      <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--text-primary)]">
        {v}
      </p>
    );
  }
  if (f.data_type === "boolean") {
    const yes = !!v;
    return (
      <span
        className={
          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
          (yes
            ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
            : "bg-[color:var(--surface-secondary)] text-[color:var(--text-secondary)]")
        }
      >
        {yes ? "Có" : "Không"}
      </span>
    );
  }
  if (f.data_type === "url" && typeof v === "string") {
    return (
      <a
        href={v}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 text-[color:var(--brand-navy)] underline"
      >
        {f.display_value ?? "Mở"} <ExternalLink className="h-3 w-3" />
      </a>
    );
  }
  if (f.data_type === "phone" && typeof v === "string") {
    return (
      <a
        href={`tel:${v.replace(/\s/g, "")}`}
        className="text-[color:var(--brand-navy)] underline"
      >
        {v}
      </a>
    );
  }
  if (f.data_type === "date" && typeof v === "string") {
    return <>{formatDate(v)}</>;
  }
  if (f.data_type === "datetime" && typeof v === "string") {
    return <>{formatDateTime(v)}</>;
  }
  if (Array.isArray(v)) {
    return (
      <div className="flex flex-wrap justify-end gap-1">
        {v.map((item, i) => (
          <span
            key={i}
            className="rounded-full bg-[color:var(--brand-navy-soft)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--brand-navy)]"
          >
            {String(item)}
          </span>
        ))}
      </div>
    );
  }
  if (f.display_value) {
    return <>{f.display_value}{f.unit ? ` ${f.unit}` : ""}</>;
  }
  return <>{String(v)}{f.unit ? ` ${f.unit}` : ""}</>;
}

export function ProductCustomFields({ fields }: { fields: MobileProductCustomField[] }) {
  const nonEmpty = fields.filter((f) => !isEmpty(f.value));
  if (nonEmpty.length === 0) return null;
  const groups = new Map<string, MobileProductCustomField[]>();
  for (const f of nonEmpty) {
    const g = f.field_group ?? "Thông tin khác";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }
  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([group, list]) => (
        <SectionCard key={group} title={group} padded={false}>
          <ul className="divide-y divide-border">
            {list.map((f) => {
              const isBlock = f.data_type === "long_text";
              return (
                <li
                  key={f.definition_id}
                  className={
                    isBlock
                      ? "space-y-1 px-4 py-3"
                      : "grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] items-start gap-3 px-4 py-3"
                  }
                >
                  <span className="text-xs text-[color:var(--text-secondary)]">{f.label}</span>
                  <div
                    className={
                      isBlock
                        ? "min-w-0"
                        : "min-w-0 text-right text-sm font-medium text-[color:var(--text-primary)]"
                    }
                  >
                    {renderValue(f)}
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ))}
    </div>
  );
}