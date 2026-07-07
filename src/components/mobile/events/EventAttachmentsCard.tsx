import { ExternalLink, File, FileText, Image as ImageIcon } from "lucide-react";
import { SectionCard } from "@/components/mobile/SectionCard";
import type { MobileEventAttachment } from "@/services/mobile/events.service";

function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return null;
  return s;
}

function iconFor(a: MobileEventAttachment) {
  const t = ((a.type as string | undefined) ?? (a.mime_type as string | undefined) ?? "").toLowerCase();
  if (t.startsWith("image")) return ImageIcon;
  if (t.includes("pdf")) return FileText;
  return File;
}

export function EventAttachmentsCard({ attachments }: { attachments: MobileEventAttachment[] }) {
  const valid = attachments
    .map((a) => ({ a, url: safeUrl(a.url ?? a.file_url ?? null) }))
    .filter((x) => x.url);
  if (valid.length === 0) return null;
  return (
    <SectionCard title="Tài liệu đính kèm" padded={false}>
      <ul className="divide-y divide-border">
        {valid.map(({ a, url }, i) => {
          const Icon = iconFor(a);
          const label = (a.label as string | null | undefined) ?? "Tài liệu";
          return (
            <li key={(a.id as string) ?? i}>
              <a
                href={url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-navy)]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[color:var(--brand-navy)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[color:var(--text-primary)]">
                  {label}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}