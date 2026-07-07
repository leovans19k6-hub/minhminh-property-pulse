import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { MobileEventEligibility } from "@/services/mobile/events.service";

const CODE_LABEL: Record<string, string> = {
  ok: "Bạn đủ điều kiện đăng ký sự kiện này.",
  permission_denied: "Bạn không có quyền đăng ký sự kiện này.",
  event_archived: "Sự kiện đã bị lưu trữ.",
  event_not_active: "Sự kiện chưa được phát hành.",
  event_paused: "Sự kiện đang tạm dừng.",
  event_cancelled: "Sự kiện đã bị huỷ.",
  event_completed: "Sự kiện đã kết thúc.",
  event_expired: "Sự kiện đã kết thúc.",
  event_registration_not_open: "Sự kiện chưa mở đăng ký.",
  event_registration_closed: "Sự kiện đã đóng đăng ký.",
  event_full: "Sự kiện đã hết suất.",
  event_user_limit_reached: "Bạn đã đạt giới hạn đăng ký cho sự kiện này.",
  event_not_applicable: "Sự kiện không áp dụng cho ngữ cảnh hiện tại.",
  event_profile_incomplete: "Cần cập nhật họ tên và số điện thoại trước khi đăng ký.",
};

export function EventEligibilityCard({ eligibility }: { eligibility: MobileEventEligibility }) {
  const eligible = eligibility.eligible;
  const code = eligibility.code;
  const msg = CODE_LABEL[code] ?? eligibility.message ?? "Không rõ trạng thái.";
  const Icon = eligible ? CheckCircle2 : code === "event_profile_incomplete" ? Info : AlertCircle;
  const tone = eligible
    ? "border-[color:var(--success,#16a34a)]/40 bg-[color:var(--success-soft,#dcfce7)] text-[color:var(--success,#166534)]"
    : code === "event_profile_incomplete"
      ? "border-[color:var(--info)]/40 bg-[color:var(--info-soft)] text-[color:var(--info)]"
      : "border-[color:var(--danger,#dc2626)]/40 bg-[color:var(--danger-soft,#fee2e2)] text-[color:var(--danger,#991b1b)]";
  return (
    <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 ${tone}`}>
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