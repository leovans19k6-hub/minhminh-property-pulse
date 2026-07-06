import { Sparkles, Ticket } from "lucide-react";
import type { MobileVoucherDetail } from "@/services/mobile/vouchers.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { InfoRow } from "@/components/mobile/InfoRow";
import { formatDate } from "@/utils/format";

const STATE_LABEL: Record<string, string> = {
  draft: "Nháp",
  upcoming_registration: "Sắp mở đăng ký",
  open: "Đang mở đăng ký",
  full: "Đã hết suất",
  registration_closed: "Đã đóng đăng ký",
  upcoming_validity: "Sắp hiệu lực",
  valid: "Đang áp dụng",
  expired: "Đã hết hạn",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
};

function stateTone(state: string): string {
  if (state === "open" || state === "valid")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (state.startsWith("upcoming"))
    return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
  if (state === "full" || state === "registration_closed" || state === "expired")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-muted text-[color:var(--text-secondary)]";
}

export function VoucherIdentityCard({ detail }: { detail: MobileVoucherDetail }) {
  const v = detail.voucher;
  const state = v.derived_state;
  return (
    <SectionCard>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {v.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-gold-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--brand-navy)]">
              <Sparkles className="h-3 w-3" />
              Nổi bật
            </span>
          )}
          {STATE_LABEL[state] && (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${stateTone(state)}`}
            >
              {STATE_LABEL[state]}
            </span>
          )}
        </div>
        <div className="flex items-start gap-2">
          <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--brand-gold)]" />
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-[color:var(--text-primary)]">
              {v.title}
            </h2>
            {v.code && (
              <p className="mt-0.5 font-mono text-[11px] uppercase text-[color:var(--text-secondary)]">
                {v.code}
              </p>
            )}
          </div>
        </div>
        {v.summary && (
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[color:var(--text-secondary)]">
            {v.summary}
          </p>
        )}
        <div className="divide-y divide-border">
          {detail.project && (
            <InfoRow label="Dự án" value={detail.project.name} />
          )}
          {(v.effective_from || v.effective_to) && (
            <InfoRow
              label="Hiệu lực"
              value={
                v.effective_from && v.effective_to
                  ? `${formatDate(v.effective_from)} – ${formatDate(v.effective_to)}`
                  : v.effective_from
                    ? `Từ ${formatDate(v.effective_from)}`
                    : `Đến ${formatDate(v.effective_to!)}`
              }
            />
          )}
          {v.registration_deadline && (
            <InfoRow label="Hạn đăng ký" value={formatDate(v.registration_deadline)} />
          )}
        </div>
      </div>
    </SectionCard>
  );
}