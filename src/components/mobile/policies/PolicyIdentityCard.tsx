import { Sparkles } from "lucide-react";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDate } from "@/utils/format";
import type { MobilePolicyDetail } from "@/services/mobile/policies.service";

function formatRange(from: string | null, to: string | null): string {
  if (!from && !to) return "Không giới hạn";
  if (from && !to) return `Từ ${formatDate(from)}`;
  if (!from && to) return `Đến ${formatDate(to)}`;
  return `${formatDate(from!)} – ${formatDate(to!)}`;
}

const STATUS_LABEL: Record<MobilePolicyDetail["policy"]["derived_effective_status"], string> = {
  effective: "Đang áp dụng",
  upcoming: "Sắp áp dụng",
  expired: "Đã hết hiệu lực",
};

interface Props {
  detail: MobilePolicyDetail;
}

export function PolicyIdentityCard({ detail }: Props) {
  const p = detail.policy;
  return (
    <SectionCard>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {p.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-navy)]">
              <Sparkles className="h-3 w-3" />
              Nổi bật
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-[color:var(--surface-muted,theme(colors.muted))] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--text-secondary)]">
            {STATUS_LABEL[p.derived_effective_status]}
          </span>
        </div>
        <h2 className="text-lg font-bold leading-snug text-[color:var(--text-primary)]">
          {p.title}
        </h2>
        {detail.project?.name && (
          <p className="text-xs text-[color:var(--text-secondary)]">{detail.project.name}</p>
        )}
      </div>
      <div className="mt-3 divide-y divide-border">
        <InfoRow label="Hiệu lực" value={formatRange(p.effective_from, p.effective_to)} />
        {p.registration_deadline && (
          <InfoRow label="Hạn đăng ký" value={formatDate(p.registration_deadline)} />
        )}
        {p.version_number != null && (
          <InfoRow label="Phiên bản" value={`v${p.version_number}`} />
        )}
      </div>
    </SectionCard>
  );
}