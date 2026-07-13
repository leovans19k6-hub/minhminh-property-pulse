import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";
import {
  cancelMyMobileVoucherRegistration,
} from "@/services/mobile/vouchers.service";
import {
  cancelMyMobileEventRegistration,
} from "@/services/mobile/events.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MobileRegistrationDomain = "CONSULTATION" | "VOUCHER" | "EVENT" | "OTHER";
export type MobileRegistrationType = "consultation" | "voucher" | "event" | "site_tour";
export type MobileRegistrationStatus =
  | "new" | "in_progress" | "confirmed" | "completed"
  | "cancelled" | "no_show" | "rejected";
export type MobileCancelMethod = "voucher" | "event" | null;

export interface MobileRegistrationProject {
  id: string;
  name: string;
  code: string | null;
  cover_url: string | null;
  address_full?: string | null;
}

export interface MobileRegistrationListItem {
  id: string;
  registration_code: string;
  registration_type: MobileRegistrationType;
  domain: MobileRegistrationDomain;
  status: MobileRegistrationStatus;
  created_at: string;
  updated_at: string;
  project: MobileRegistrationProject | null;
  voucher: { id: string; title: string; code: string | null } | null;
  event: {
    id: string;
    title: string;
    event_type: string;
    start_at: string | null;
    end_at: string | null;
  } | null;
  product: {
    id: string;
    product_code: string;
    product_name: string | null;
  } | null;
  can_cancel: boolean;
  cancel_method: MobileCancelMethod;
}

export interface MobileRegistrationActivity {
  id: string;
  activity_type: string;
  title: string;
  occurred_at: string;
}

export interface MobileRegistrationPrimaryContact {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  position: string | null;
  branch: string | null;
  department: string | null;
  zalo_url: string | null;
  member_role: string | null;
}

export interface MobileRegistrationDetail {
  registration: {
    id: string;
    registration_code: string;
    registration_type: MobileRegistrationType;
    domain: MobileRegistrationDomain;
    status: MobileRegistrationStatus;
    note: string | null;
    created_at: string;
    updated_at: string;
  };
  project: MobileRegistrationProject | null;
  voucher: {
    id: string;
    title: string;
    code: string | null;
    summary: string | null;
    thumbnail_url: string | null;
    valid_from: string | null;
    valid_to: string | null;
    archived_at: string | null;
  } | null;
  event: {
    id: string;
    title: string;
    event_type: string;
    summary: string | null;
    thumbnail_url: string | null;
    start_at: string | null;
    end_at: string | null;
    timezone: string | null;
    location_type: string | null;
    location_name: string | null;
    address_text: string | null;
    meeting_url: string | null;
    status: string | null;
    archived_at: string | null;
  } | null;
  product: { id: string; product_code: string; product_name: string | null } | null;
  primary_contact: MobileRegistrationPrimaryContact | null;
  activities: MobileRegistrationActivity[];
  capabilities: {
    can_cancel: boolean;
    cancel_method: MobileCancelMethod;
  };
}

// ---------------------------------------------------------------------------
// Error mapping (VN)
// ---------------------------------------------------------------------------
const ERROR_MAP: Record<string, string> = {
  permission_denied: "Bạn không có quyền xem đăng ký này.",
  registration_not_found: "Không tìm thấy đăng ký.",
  registration_not_cancellable: "Không thể huỷ đăng ký này.",
  inactive_user: "Tài khoản chưa được kích hoạt.",
};

export function mapMobileRegistrationError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  if (ERROR_MAP[code]) return ERROR_MAP[code];
  if (raw.includes("permission")) return ERROR_MAP.permission_denied;
  return "Không thể tải đăng ký. Vui lòng thử lại.";
}

function assertDetailShape(v: unknown): asserts v is MobileRegistrationDetail {
  if (!v || typeof v !== "object") throw new ServiceError("Dữ liệu đăng ký không hợp lệ.");
  const o = v as Record<string, unknown>;
  const reg = o.registration as Record<string, unknown> | null;
  if (!reg || typeof reg !== "object" || typeof reg.id !== "string" || typeof reg.status !== "string") {
    throw new ServiceError("Dữ liệu đăng ký không hợp lệ.");
  }
  if (!Array.isArray(o.activities)) throw new ServiceError("Dữ liệu đăng ký không hợp lệ.");
  if (!o.capabilities || typeof o.capabilities !== "object") {
    throw new ServiceError("Dữ liệu đăng ký không hợp lệ.");
  }
}

// ---------------------------------------------------------------------------
// RPC wrappers
// ---------------------------------------------------------------------------
export interface MobileRegistrationSearchArgs {
  projectId?: string | null;
  domain?: MobileRegistrationDomain | null;
  registrationType?: MobileRegistrationType | null;
  status?: MobileRegistrationStatus | null;
  query?: string | null;
  limit?: number;
  offset?: number;
}

export async function searchMyMobileRegistrations(
  args: MobileRegistrationSearchArgs = {},
): Promise<MobileRegistrationListItem[]> {
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const res = await supabase.rpc("search_my_mobile_registrations" as never, {
    p_project_id: args.projectId ?? null,
    p_domain: args.domain ?? null,
    p_registration_type: args.registrationType ?? null,
    p_status: args.status ?? null,
    p_query: args.query ?? null,
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (res.error) throw new ServiceError(mapMobileRegistrationError(res.error), res.error);
  const data = res.data as unknown as { rows: MobileRegistrationListItem[] } | null;
  return data?.rows ?? [];
}

export async function getMyMobileRegistrationDetail(
  registrationId: string,
): Promise<MobileRegistrationDetail> {
  const res = await supabase.rpc("get_my_mobile_registration_detail" as never, {
    p_registration_id: registrationId,
  } as never);
  if (res.error) throw new ServiceError(mapMobileRegistrationError(res.error), res.error);
  const data = res.data as unknown;
  assertDetailShape(data);
  return data;
}

/**
 * Cancels a registration via the canonical voucher/event cancel RPCs.
 * Never mutates registrations through a generic operations flow — that path
 * is admin-only and off-limits from mobile per Phase 7C.4 scope.
 */
export async function cancelMyMobileRegistration(
  registrationId: string,
  method: MobileCancelMethod,
): Promise<{ registration_id: string; status: string }> {
  if (method === "voucher") return cancelMyMobileVoucherRegistration(registrationId);
  if (method === "event") return cancelMyMobileEventRegistration(registrationId);
  throw new ServiceError("Không thể huỷ đăng ký này từ ứng dụng.");
}