import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { MobileVoucherEligibility } from "@/services/mobile/vouchers.service";

interface Props {
  eligibility: MobileVoucherEligibility;
}

const CODE_LABEL: Record<string, string> = {
  ok: "Bạn đủ điều kiện đăng ký voucher này.",
  permission_denied: "Bạn không có quyền đăng ký voucher này.",
  voucher_archived: "Voucher đã bị lưu trữ.",
  voucher_not_active: "Voucher chưa được phát hành.",
  voucher_paused: "Voucher đang tạm dừng.",
  voucher_expired: "Voucher đã hết hạn.",
  voucher_registration_not_open: "Voucher chưa mở đăng ký.",
  voucher_registration_closed: "Voucher đã đóng đăng ký.",
  voucher_full: "Voucher đã hết số lượng.",
  voucher_user_limit_reached: "Bạn đã đạt giới hạn đăng ký cho voucher này.",
  voucher_not_applicable: "Voucher không áp dụng cho ngữ cảnh hiện tại.",
  voucher_profile_incomplete: "Bạn cần cập nhật họ tên và số điện thoại trước khi đăng ký.",
};

export function VoucherEligibilityCard({ eligibility }: Props) {
  const eligible = eligibility.eligible;
  const code = eligibility.code;
  const msg = CODE_LABEL[code] ?? eligibility.message ?? "Không rõ trạng thái.";
  const Icon = eligible ? CheckCircle2 : code === "voucher_profile_incomplete" ? Info : AlertCircle;
  const tone = eligible
    ? "border-[color:var(--success,#16a34a)]/40 bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]"
    : code === "voucher_profile_incomplete"
      ? "border-[color:var(--info)]/40 bg-[color:var(--info-soft)] text-[color:var(--info)]"
      : "border-[color:var(--danger,#dc2626)]/40 bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-4 ${tone}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold">
          {eligible ? "Đủ điều kiện đăng ký" : "Chưa thể đăng ký"}
        </p>
        <p className="text-[13px] leading-relaxed">{msg}</p>
      </div>
    </div>
  );
}