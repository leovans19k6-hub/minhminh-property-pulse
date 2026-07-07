import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

// ---------------------------------------------------------------------------
// Types (mobile-safe subset)
// ---------------------------------------------------------------------------
export type MobileEventDerivedState =
  | "upcoming_registration"
  | "registration_open"
  | "upcoming"
  | "ongoing"
  | "full"
  | "registration_closed"
  | "completed";

export interface MobileEventListItem {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  title: string;
  slug: string;
  event_type: string;
  summary: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  location_type: string | null;
  location_name: string | null;
  address_text: string | null;
  meeting_url: string | null;
  thumbnail_url: string | null;
  is_featured: boolean;
  priority: number;
  derived_state: string;
  registration_start: string | null;
  registration_deadline: string | null;
  capacity: number | null;
  registration_count: number;
  remaining: number | null;
  is_unlimited: boolean;
  per_user_limit: number;
  user_registration_count: number;
}

export interface MobileEventSession {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  location_text: string | null;
  display_order: number;
}

export interface MobileEventAgendaItem {
  id?: string;
  time_label?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  display_order?: number | null;
  [key: string]: unknown;
}

export interface MobileEventSpeaker {
  id?: string;
  name?: string | null;
  title?: string | null;
  organization?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  display_order?: number | null;
  [key: string]: unknown;
}

export interface MobileEventAttachment {
  id?: string;
  label?: string | null;
  url?: string | null;
  file_url?: string | null;
  type?: string | null;
  mime_type?: string | null;
  [key: string]: unknown;
}

export interface MobileSiteTourDetails {
  meeting_point?: string | null;
  transportation?: string | null;
  departure_time?: string | null;
  return_time?: string | null;
  included?: string[] | null;
  requirements?: string[] | null;
  contact_note?: string | null;
  [key: string]: unknown;
}

export interface MobileEventRegistrationSummary {
  id: string;
  registration_code: string | null;
  status: string;
  created_at: string;
  can_cancel: boolean;
}

export interface MobileEventEligibility {
  eligible: boolean;
  code: string;
  message: string;
  derived_state?: string | null;
  capacity?: number | null;
  registration_count?: number | null;
  remaining?: number | null;
  user_registration_count?: number | null;
  event_type?: string | null;
}

export interface MobileEventApplicability {
  scope: "project_wide" | "product_types" | "specific_products" | "sales_policies" | "vouchers" | "mixed";
  product_types: Array<{ id: string; name: string }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  policies: Array<{ id: string; title: string }>;
  vouchers: Array<{ id: string; title: string; code: string | null }>;
  applies_to_current_product: boolean | null;
  applies_to_current_policy: boolean | null;
}

export interface MobileEventDetail {
  event: {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    event_type: string;
    summary: string | null;
    content: string | null;
    start_at: string | null;
    end_at: string | null;
    timezone: string;
    registration_start: string | null;
    registration_deadline: string | null;
    location_type: string;
    location_name: string | null;
    address_text: string | null;
    meeting_url: string | null;
    latitude: number | null;
    longitude: number | null;
    location_notes: string | null;
    thumbnail_url: string | null;
    contact_phone: string | null;
    is_featured: boolean;
    priority: number;
    capacity: number | null;
    per_user_limit: number;
    derived_state: string;
    published_at: string | null;
    agenda: MobileEventAgendaItem[];
    speakers: MobileEventSpeaker[];
    attachments: MobileEventAttachment[];
    site_tour_details: MobileSiteTourDetails;
    is_unlimited: boolean;
    capacity_remaining: number | null;
    capacity_used: number;
  };
  project: {
    id: string;
    code: string | null;
    name: string;
    cover_url: string | null;
  } | null;
  sessions: MobileEventSession[];
  capacity_stats: {
    capacity: number | null;
    registration_count: number;
    remaining: number | null;
  };
  applicability_summary: MobileEventApplicability;
  eligibility: MobileEventEligibility;
  my_registration_state: {
    active_registration_count: number;
    total_registration_count: number;
    per_user_limit: number;
    remaining_user_quota: number;
    registrations: MobileEventRegistrationSummary[];
    latest_registration_id: string | null;
    latest_registration_status: string | null;
    can_register: boolean;
    can_cancel: boolean;
    cancellation_registration_id: string | null;
  };
  primary_contact: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    position: string | null;
    branch: string | null;
    department: string | null;
    zalo_url: string | null;
    member_role: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Error mapping (VN)
// ---------------------------------------------------------------------------
export function mapMobileEventError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  const map: Record<string, string> = {
    permission_denied: "Bạn không có quyền thao tác sự kiện này.",
    not_found: "Không tìm thấy sự kiện.",
    event_not_active: "Sự kiện chưa được công bố hoặc đã lưu trữ.",
    event_archived: "Sự kiện đã bị lưu trữ.",
    event_paused: "Sự kiện đang tạm dừng.",
    event_cancelled: "Sự kiện đã bị huỷ.",
    event_completed: "Sự kiện đã kết thúc.",
    event_expired: "Sự kiện đã kết thúc.",
    event_full: "Sự kiện đã đầy.",
    event_user_limit_reached: "Bạn đã đạt giới hạn đăng ký cho sự kiện này.",
    event_registration_not_open: "Sự kiện chưa mở đăng ký.",
    event_registration_closed: "Sự kiện đã đóng đăng ký.",
    event_not_applicable: "Sự kiện không áp dụng cho ngữ cảnh này.",
    event_profile_incomplete: "Cần cập nhật họ tên và số điện thoại trước khi đăng ký.",
    duplicate_event_registration: "Bạn đã đăng ký sự kiện này.",
    invalid_event_policy: "Chính sách không thuộc dự án của sự kiện.",
    invalid_event_voucher: "Voucher không thuộc dự án của sự kiện.",
    registration_not_cancellable: "Không thể huỷ đăng ký này.",
  };
  if (map[code]) return map[code];
  if (raw.includes("permission")) return "Bạn không có quyền thực hiện thao tác này.";
  return "Không thể tải sự kiện. Vui lòng thử lại.";
}

function assertMobileEventDetailShape(v: unknown): asserts v is MobileEventDetail {
  if (!v || typeof v !== "object") throw new ServiceError("Dữ liệu sự kiện không hợp lệ.");
  const o = v as Record<string, unknown>;
  const ev = o.event as Record<string, unknown> | null;
  if (!ev || typeof ev !== "object" || typeof ev.id !== "string" || typeof ev.title !== "string") {
    throw new ServiceError("Dữ liệu sự kiện không hợp lệ.");
  }
  if (!Array.isArray(o.sessions)) throw new ServiceError("Dữ liệu sự kiện không hợp lệ.");
  if (!o.applicability_summary || !o.eligibility || !o.my_registration_state) {
    throw new ServiceError("Dữ liệu sự kiện không hợp lệ.");
  }
}

// ---------------------------------------------------------------------------
// RPC wrappers
// ---------------------------------------------------------------------------
export interface MobileEventSearchArgs {
  projectId?: string | null;
  query?: string | null;
  eventType?: string | null;
  featured?: boolean | null;
  derivedState?: MobileEventDerivedState | null;
  startsFrom?: string | null;
  startsTo?: string | null;
  productId?: string | null;
  limit?: number;
  offset?: number;
}

export async function searchMobileEvents(
  args: MobileEventSearchArgs = {},
): Promise<MobileEventListItem[]> {
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const res = await supabase.rpc("search_mobile_events" as never, {
    p_project_id: args.projectId ?? null,
    p_query: args.query ?? null,
    p_event_type: args.eventType ?? null,
    p_featured: args.featured ?? null,
    p_derived_state: args.derivedState ?? null,
    p_starts_from: args.startsFrom ?? null,
    p_starts_to: args.startsTo ?? null,
    p_product_id: args.productId ?? null,
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (res.error) throw new ServiceError(mapMobileEventError(res.error), res.error);
  const data = res.data as unknown as { rows: MobileEventListItem[] } | null;
  return data?.rows ?? [];
}

export async function getMobileEventDetail(
  eventId: string,
  ctx: {
    productId?: string | null;
    productTypeId?: string | null;
    policyId?: string | null;
    voucherId?: string | null;
  } = {},
): Promise<MobileEventDetail> {
  const res = await supabase.rpc("get_mobile_event_detail" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapMobileEventError(res.error), res.error);
  const data = res.data as unknown;
  assertMobileEventDetailShape(data);
  return data;
}

export async function registerForMobileEvent(
  eventId: string,
  ctx: {
    productId?: string | null;
    productTypeId?: string | null;
    policyId?: string | null;
    voucherId?: string | null;
    note?: string | null;
  } = {},
): Promise<{
  registration_id: string;
  registration_code: string | null;
  status: string;
  event_id: string;
  event_type: string;
  remaining: number | null;
}> {
  const res = await supabase.rpc("register_for_event" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
    p_note: ctx.note ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapMobileEventError(res.error), res.error);
  return res.data as unknown as {
    registration_id: string;
    registration_code: string | null;
    status: string;
    event_id: string;
    event_type: string;
    remaining: number | null;
  };
}

export async function cancelMyMobileEventRegistration(
  registrationId: string,
): Promise<{ registration_id: string; status: string }> {
  const res = await supabase.rpc("cancel_my_event_registration" as never, {
    p_registration_id: registrationId,
  } as never);
  if (res.error) throw new ServiceError(mapMobileEventError(res.error), res.error);
  return res.data as unknown as { registration_id: string; status: string };
}