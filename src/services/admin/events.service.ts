import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export const EVENT_TYPES = [
  "site_tour","sales_event","training","opening","customer_event","other","event","launch",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  site_tour: "Site Tour",
  sales_event: "Sự kiện bán hàng",
  training: "Đào tạo",
  opening: "Khai trương",
  customer_event: "Sự kiện khách hàng",
  other: "Khác",
  event: "Sự kiện",
  launch: "Ra mắt",
};

export const EVENT_STATUSES = [
  "draft","active","paused","cancelled","completed","archived","inactive",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Bản nháp",
  active: "Đang hoạt động",
  paused: "Tạm dừng",
  cancelled: "Đã huỷ",
  completed: "Đã kết thúc",
  archived: "Đã lưu trữ",
  inactive: "Không hoạt động",
};

export const EVENT_DERIVED_STATES = [
  "draft","upcoming_registration","registration_open","upcoming","ongoing",
  "full","registration_closed","completed","cancelled","paused","archived",
] as const;
export type EventDerivedState = (typeof EVENT_DERIVED_STATES)[number];
export const EVENT_DERIVED_STATE_LABELS: Record<string, string> = {
  draft: "Nháp",
  upcoming_registration: "Sắp mở đăng ký",
  registration_open: "Mở đăng ký",
  upcoming: "Sắp diễn ra",
  ongoing: "Đang diễn ra",
  full: "Đã đầy",
  registration_closed: "Đóng đăng ký",
  completed: "Đã kết thúc",
  cancelled: "Đã huỷ",
  paused: "Tạm dừng",
  archived: "Lưu trữ",
};

export const EVENT_LOCATION_TYPES = ["physical","online","hybrid"] as const;
export type EventLocationType = (typeof EVENT_LOCATION_TYPES)[number];
export const EVENT_LOCATION_TYPE_LABELS: Record<EventLocationType, string> = {
  physical: "Trực tiếp", online: "Trực tuyến", hybrid: "Kết hợp",
};

export const EVENT_APPLICABILITY_SCOPES = [
  "project_wide","product_types","specific_products","sales_policies","vouchers","mixed",
] as const;
export type EventApplicabilityScope = (typeof EVENT_APPLICABILITY_SCOPES)[number];

export interface EventAgendaItem {
  id: string; time_label?: string; title: string; description?: string;
  location?: string; display_order?: number;
}
export interface EventSpeaker {
  id: string; name: string; title?: string; organization?: string;
  avatar_url?: string; bio?: string; display_order?: number;
}
export interface EventAttachment {
  id: string; label: string; url: string;
  type: "pdf"|"image"|"document"|"spreadsheet"|"video"|"link";
}
export interface SiteTourDetails {
  meeting_point?: string; transportation?: string;
  departure_time?: string; return_time?: string;
  included?: string[]; requirements?: string[]; contact_note?: string;
}
export interface EventSession {
  id: string; title: string; description?: string | null;
  starts_at: string; ends_at: string;
  location_text?: string | null; display_order: number;
  metadata?: Record<string, unknown>;
}

export interface EventListRow {
  id: string; title: string; slug: string; event_type: EventType;
  status: EventStatus; derived_state: EventDerivedState;
  registration_start: string | null; registration_deadline: string | null;
  start_at: string | null; end_at: string | null; timezone: string;
  location_type: EventLocationType;
  location_name: string | null; address_text: string | null;
  capacity: number | null; registration_count: number; remaining: number | null;
  pt_count: number; p_count: number; pol_count: number; vo_count: number;
  applicability_scope: EventApplicabilityScope;
  is_featured: boolean; priority: number; updated_at: string;
}

export interface EventAdminDetail {
  event: {
    id: string; project_id: string; title: string; slug: string;
    event_type: EventType; summary: string | null; content: string | null;
    location_type: EventLocationType;
    location_name: string | null; address_text: string | null;
    meeting_url: string | null; latitude: number | null; longitude: number | null;
    location_notes: string | null;
    start_at: string | null; end_at: string | null;
    registration_start: string | null; registration_deadline: string | null;
    timezone: string; capacity: number | null; per_user_limit: number;
    agenda_json: EventAgendaItem[]; speakers_json: EventSpeaker[];
    attachments: EventAttachment[]; site_tour_details: SiteTourDetails;
    thumbnail_url: string | null; contact_phone: string | null;
    is_featured: boolean; priority: number;
    applicability_scope: EventApplicabilityScope;
    status: EventStatus; archived_at: string | null; published_at: string | null;
    created_at: string; updated_at: string;
  };
  derived_state: EventDerivedState;
  project: { id: string; name: string; code: string } | null;
  sessions: EventSession[];
  product_types: Array<{ id: string; name: string; code: string | null }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  policies: Array<{ id: string; title: string; slug: string }>;
  vouchers: Array<{ id: string; title: string; slug: string; code: string | null }>;
  capacity_stats: { capacity: number | null; registration_count: number; remaining: number | null };
  registration_stats: { pending: number; confirmed: number; cancelled: number };
  permissions: { can_manage: boolean };
}

export const EVENT_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function validateEventSlug(slug: string): string | null {
  if (!slug) return "Bắt buộc";
  if (!EVENT_SLUG_REGEX.test(slug)) return "Chỉ chữ thường, số, dấu gạch ngang";
  if (slug.length > 120) return "Tối đa 120 ký tự";
  return null;
}
export function slugify(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 120);
}

export function mapEventError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  const map: Record<string, string> = {
    permission_denied: "Không có quyền thao tác sự kiện.",
    not_found: "Không tìm thấy sự kiện.",
    event_archived: "Sự kiện đã lưu trữ.",
    event_not_archived: "Chỉ khôi phục được sự kiện đã lưu trữ.",
    event_not_active: "Sự kiện không ở trạng thái phù hợp.",
    event_paused: "Sự kiện đang tạm dừng.",
    event_cancelled: "Sự kiện đã bị huỷ.",
    event_completed: "Sự kiện đã kết thúc.",
    event_expired: "Sự kiện đã hết thời gian.",
    event_full: "Sự kiện đã đầy.",
    event_user_limit_reached: "Bạn đã đạt giới hạn cá nhân cho sự kiện này.",
    event_registration_not_open: "Chưa mở đăng ký.",
    event_registration_closed: "Đã đóng đăng ký.",
    event_not_applicable: "Sự kiện không áp dụng cho ngữ cảnh này.",
    event_profile_incomplete: "Cần cập nhật họ tên & số điện thoại.",
    duplicate_event_slug: "Slug sự kiện đã tồn tại.",
    duplicate_event_registration: "Bạn đã đăng ký sự kiện này.",
    invalid_event_type: "Loại sự kiện không hợp lệ.",
    invalid_event_dates: "Khoảng thời gian không hợp lệ.",
    invalid_event_timezone: "Múi giờ không hợp lệ.",
    invalid_event_location: "Địa điểm không hợp lệ.",
    invalid_site_tour_details: "Thông tin Site Tour không hợp lệ.",
    invalid_event_agenda: "Chương trình không hợp lệ.",
    too_many_event_agenda_items: "Vượt quá 100 mục chương trình.",
    duplicate_event_agenda_id: "Trùng ID mục chương trình.",
    invalid_event_speakers: "Diễn giả không hợp lệ.",
    too_many_event_speakers: "Vượt quá 50 diễn giả.",
    duplicate_event_speaker_id: "Trùng ID diễn giả.",
    invalid_event_attachment: "Tài liệu không hợp lệ.",
    too_many_event_attachments: "Vượt quá 30 tài liệu.",
    invalid_event_session: "Phiên sự kiện không hợp lệ.",
    too_many_event_sessions: "Vượt quá 100 phiên.",
    invalid_event_capacity: "Sức chứa không hợp lệ.",
    capacity_below_registration_count: "Sức chứa nhỏ hơn số đăng ký hiện có.",
    invalid_event_product_type: "Loại sản phẩm không thuộc dự án.",
    invalid_event_product: "Sản phẩm không thuộc dự án.",
    invalid_event_policy: "Chính sách không thuộc dự án.",
    invalid_event_voucher: "Voucher không thuộc dự án.",
    registration_not_cancellable: "Không thể huỷ đăng ký này.",
  };
  return map[code] ?? raw;
}

interface SearchArgs {
  projectId: string;
  query?: string | null;
  eventType?: EventType | null;
  status?: EventStatus | null;
  derivedState?: EventDerivedState | null;
  featured?: boolean | null;
  startsFrom?: string | null;
  startsTo?: string | null;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}
export async function searchEvents(a: SearchArgs): Promise<{ rows: EventListRow[]; total: number }> {
  const res = await supabase.rpc("search_events" as never, {
    p_project_id: a.projectId, p_query: a.query ?? null,
    p_event_type: a.eventType ?? null, p_status: a.status ?? null,
    p_derived_state: a.derivedState ?? null, p_featured: a.featured ?? null,
    p_starts_from: a.startsFrom ?? null, p_starts_to: a.startsTo ?? null,
    p_include_archived: !!a.includeArchived,
    p_limit: a.limit ?? 50, p_offset: a.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return (res.data as unknown as { rows: EventListRow[]; total: number }) ?? { rows: [], total: 0 };
}

export async function getEventAdminDetail(eventId: string): Promise<EventAdminDetail> {
  const res = await supabase.rpc("get_event_admin_detail" as never, { p_event_id: eventId } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as EventAdminDetail;
}

export interface CreateEventInput {
  projectId: string;
  event: {
    title: string; slug: string; event_type: EventType;
    summary?: string | null; content?: string | null;
    location_type?: EventLocationType;
    location_name?: string | null; address_text?: string | null;
    meeting_url?: string | null; latitude?: number | null; longitude?: number | null;
    location_notes?: string | null;
    start_at?: string | null; end_at?: string | null; timezone?: string;
    registration_start?: string | null; registration_deadline?: string | null;
    capacity?: number | null; per_user_limit?: number;
    agenda_json?: EventAgendaItem[]; speakers_json?: EventSpeaker[];
    attachments?: EventAttachment[]; site_tour_details?: SiteTourDetails;
    thumbnail_url?: string | null; contact_phone?: string | null;
    is_featured?: boolean; priority?: number;
  };
  sessions?: Omit<EventSession, "id" | "metadata">[] | EventSession[];
  productTypeIds: string[];
  productIds: string[];
  policyIds: string[];
  voucherIds: string[];
  publish?: boolean;
}
export async function createEvent(input: CreateEventInput) {
  const res = await supabase.rpc("create_event" as never, {
    p_project_id: input.projectId,
    p_event: input.event,
    p_sessions: input.sessions ?? [],
    p_product_type_ids: input.productTypeIds,
    p_product_ids: input.productIds,
    p_policy_ids: input.policyIds,
    p_voucher_ids: input.voucherIds,
    p_publish: !!input.publish,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as { event_id: string; slug: string; event_type: EventType; status: EventStatus };
}

export interface UpdateEventInput {
  eventId: string;
  patch: Partial<CreateEventInput["event"]>;
  sessions?: EventSession[] | null;
  productTypeIds?: string[] | null;
  productIds?: string[] | null;
  policyIds?: string[] | null;
  voucherIds?: string[] | null;
}
export async function updateEvent(input: UpdateEventInput) {
  const res = await supabase.rpc("update_event" as never, {
    p_event_id: input.eventId, p_event_patch: input.patch,
    p_sessions: input.sessions ?? null,
    p_product_type_ids: input.productTypeIds ?? null,
    p_product_ids: input.productIds ?? null,
    p_policy_ids: input.policyIds ?? null,
    p_voucher_ids: input.voucherIds ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as { event_id: string; changed: boolean };
}

async function callSimple(fn: string, params: Record<string, unknown>) {
  const res = await supabase.rpc(fn as never, params as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data;
}
export const publishEvent = (id: string) => callSimple("publish_event", { p_event_id: id });
export const pauseEvent = (id: string) => callSimple("pause_event", { p_event_id: id });
export const resumeEvent = (id: string) => callSimple("resume_event", { p_event_id: id });
export const cancelEvent = (id: string, reason?: string | null) =>
  callSimple("cancel_event", { p_event_id: id, p_reason: reason ?? null });
export const completeEvent = (id: string, reason?: string | null) =>
  callSimple("complete_event", { p_event_id: id, p_reason: reason ?? null });
export const archiveEvent = (id: string, reason?: string | null) =>
  callSimple("archive_event", { p_event_id: id, p_reason: reason ?? null });
export const restoreEvent = (id: string) => callSimple("restore_event", { p_event_id: id });
export const cloneEvent = (id: string, newSlug: string, newTitle?: string | null, shiftStart?: string | null) =>
  callSimple("clone_event", { p_event_id: id, p_new_slug: newSlug, p_new_title: newTitle ?? null, p_shift_start: shiftStart ?? null });

export interface EventEligibilityResult {
  eligible: boolean; code: string; message: string;
  derived_state?: string; capacity?: number | null;
  registration_count?: number; remaining?: number | null;
  user_registration_count?: number; event_type?: EventType;
}
export async function checkEventEligibility(
  eventId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null; voucherId?: string | null } = {},
): Promise<EventEligibilityResult> {
  const res = await supabase.rpc("check_event_eligibility" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as EventEligibilityResult;
}

// Calendar helper (client-only)
export interface CalendarData {
  title: string; description: string;
  startsAt: string; endsAt: string; timezone: string;
  location: string; url?: string | null;
}
export function eventToCalendarData(e: {
  title: string; summary?: string | null; start_at: string | null; end_at: string | null;
  timezone: string; location_name?: string | null; address_text?: string | null; meeting_url?: string | null;
}): CalendarData | null {
  if (!e.start_at || !e.end_at) return null;
  const loc = [e.location_name, e.address_text].filter(Boolean).join(", ") || (e.meeting_url ?? "");
  return {
    title: e.title, description: e.summary ?? "",
    startsAt: e.start_at, endsAt: e.end_at, timezone: e.timezone,
    location: loc, url: e.meeting_url ?? null,
  };
}