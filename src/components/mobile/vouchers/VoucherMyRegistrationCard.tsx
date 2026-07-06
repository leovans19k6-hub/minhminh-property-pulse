import type { MobileVoucherDetail } from "@/services/mobile/vouchers.service";
import { SectionCard } from "@/components/mobile/SectionCard";
import { formatDateTime } from "@/utils/format";

const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  in_progress: "Đang xử lý",
  confirmed: "Đã xác nhận",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
  no_show: "Không tham dự",
};

function statusTone(status: string): string {
  if (status === "confirmed" || status === "completed")
    return "bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]";
  if (status === "cancelled" || status === "no_show")
    return "bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return "bg-[color:var(--info-soft)] text-[color:var(--info)]";
}

export function VoucherMyRegistrationCard({ detail }: { detail: MobileVoucherDetail }) {
  const my = detail.my_registration_state;
  if (my.registrations.length === 0) return null;
  return (
    <SectionCard title="Đăng ký của bạn">
      <ul className="space-y-2">
        {my.registrations.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[color:var(--surface)] p-3"
          >
            <div className="min-w-0 space-y-0.5">
              {r.registration_code && (
                <p className="font-mono text-[11px] uppercase text-[color:var(--text-secondary)]">
                  {r.registration_code}
                </p>
              )}
              <p className="text-[11px] text-[color:var(--text-tertiary)]">
                {formatDateTime(r.created_at)}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone(r.status)}`}
            >
              {STATUS_LABEL[r.status] ?? r.status}
            </span>
          </li>
        ))}
      </ul>
      {detail.voucher.per_user_limit > 1 && (
        <p className="mt-2 text-[11px] text-[color:var(--text-tertiary)]">
          Đã dùng {my.active_registration_count}/{detail.voucher.per_user_limit} lượt cho phép
        </p>
      )}
    </SectionCard>
  );
}