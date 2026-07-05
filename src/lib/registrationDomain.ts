/**
 * Canonical registration-domain constants (Phase 6C.1).
 *
 * Keep in sync with the SQL predicate `public.is_event_registration_type(text)`
 * and the shared status literals used in `register_for_event` /
 * `register_for_voucher`.
 */

export const EVENT_REGISTRATION_TYPES = ["event", "site_tour"] as const;
export type EventRegistrationType = (typeof EVENT_REGISTRATION_TYPES)[number];

export const VOUCHER_REGISTRATION_TYPES = ["voucher"] as const;
export type VoucherRegistrationType = (typeof VOUCHER_REGISTRATION_TYPES)[number];

export const ALL_REGISTRATION_TYPES = [
  "consultation",
  "voucher",
  "site_tour",
  "event",
] as const;
export type RegistrationType = (typeof ALL_REGISTRATION_TYPES)[number];

/**
 * Statuses that count against event/voucher capacity and per-user limits.
 * MUST match the SQL literals used inside `_event_registration_count`,
 * `_voucher_registration_count`, and the RPC capacity checks.
 */
export const CAPACITY_COUNTING_STATUSES = [
  "new",
  "in_progress",
  "confirmed",
  "completed",
] as const;

/**
 * Statuses a registrant may cancel themselves.
 * MUST match `cancel_my_event_registration` / `cancel_my_voucher_registration`.
 */
export const CANCELLABLE_STATUSES = ["new", "in_progress"] as const;

/**
 * Terminal statuses — no further transitions expected without admin action.
 */
export const TERMINAL_STATUSES = [
  "completed",
  "cancelled",
  "no_show",
  "rejected",
] as const;

export type RegistrationDomain = "event" | "voucher" | "consultation";

export function isEventRegistrationType(t: string | null | undefined): t is EventRegistrationType {
  return t === "event" || t === "site_tour";
}

export function isVoucherRegistrationType(t: string | null | undefined): t is VoucherRegistrationType {
  return t === "voucher";
}

export function getCanonicalRegistrationDomain(t: string | null | undefined): RegistrationDomain | null {
  if (isEventRegistrationType(t)) return "event";
  if (isVoucherRegistrationType(t)) return "voucher";
  if (t === "consultation") return "consultation";
  return null;
}

export function countsAgainstCapacity(status: string | null | undefined): boolean {
  return CAPACITY_COUNTING_STATUSES.includes(status as (typeof CAPACITY_COUNTING_STATUSES)[number]);
}

export function isCancellableByOwner(status: string | null | undefined): boolean {
  return CANCELLABLE_STATUSES.includes(status as (typeof CANCELLABLE_STATUSES)[number]);
}

// ============================================================
// Phase 6D — canonical Operations Engine constants
// ============================================================

/** Canonical stored registration domain (Phase 6D). */
export const REGISTRATION_DOMAINS = ["CONSULTATION", "POLICY", "VOUCHER", "EVENT", "OTHER"] as const;
export type RegistrationDomainCode = (typeof REGISTRATION_DOMAINS)[number];

/** Map registration_type → canonical domain. Mirrors SQL `public.get_registration_domain`. */
export function getRegistrationDomain(t: string | null | undefined): RegistrationDomainCode {
  if (t === "event" || t === "site_tour") return "EVENT";
  if (t === "voucher") return "VOUCHER";
  if (t === "consultation") return "CONSULTATION";
  return "OTHER";
}

export const REGISTRATION_DOMAIN_LABELS: Record<RegistrationDomainCode, string> = {
  CONSULTATION: "Tư vấn",
  POLICY: "Chính sách",
  VOUCHER: "Voucher",
  EVENT: "Sự kiện",
  OTHER: "Khác",
};

export const LEAD_STATUSES = ["new", "contacted", "qualified", "nurturing", "converted", "lost", "archived"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Đủ điều kiện",
  nurturing: "Nuôi dưỡng",
  converted: "Đã chuyển đổi",
  lost: "Đã mất",
  archived: "Lưu trữ",
};

export const LEAD_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Thấp", normal: "Bình thường", high: "Cao", urgent: "Khẩn cấp",
};

export const REGISTRATION_STATUSES = ["new", "in_progress", "confirmed", "completed", "cancelled", "no_show", "rejected"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  new: "Mới", in_progress: "Đang xử lý", confirmed: "Đã xác nhận",
  completed: "Hoàn tất", cancelled: "Đã hủy", no_show: "Vắng mặt", rejected: "Từ chối",
};

export const TASK_STATUSES = ["open", "in_progress", "completed", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Mở", in_progress: "Đang thực hiện", completed: "Hoàn tất", cancelled: "Đã hủy",
};

export const ACTIVITY_USER_TYPES = ["note", "call", "meeting", "follow_up", "other"] as const;
export type UserActivityType = (typeof ACTIVITY_USER_TYPES)[number];
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  note: "Ghi chú", call: "Gọi điện", meeting: "Gặp mặt", follow_up: "Theo dõi",
  status_change: "Đổi trạng thái", assignment: "Phân công",
  registration_review: "Duyệt đăng ký", system: "Hệ thống", other: "Khác",
};

/** Client-side transition validator; mirrors SQL `public.can_transition_lead_status`. */
export function canTransitionLeadStatus(from: string, to: string): boolean {
  const map: Record<string, string[]> = {
    new: ["contacted", "qualified", "lost", "archived"],
    contacted: ["qualified", "nurturing", "lost", "archived"],
    qualified: ["nurturing", "converted", "lost", "archived"],
    nurturing: ["contacted", "qualified", "converted", "lost", "archived"],
    lost: ["nurturing", "archived"],
  };
  return (map[from] ?? []).includes(to);
}

export function canTransitionRegistrationStatus(from: string, to: string): boolean {
  const map: Record<string, string[]> = {
    new: ["in_progress", "confirmed", "rejected", "cancelled"],
    in_progress: ["confirmed", "rejected", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
  };
  return (map[from] ?? []).includes(to);
}