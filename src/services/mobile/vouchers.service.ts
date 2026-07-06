import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

// ---------------------------------------------------------------------------
// Types (mobile-safe subset)
// ---------------------------------------------------------------------------
export type MobileVoucherRegistrationState =
  | "open"
  | "upcoming"
  | "closed";

export interface MobileVoucherListItem {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  title: string;
  code: string | null;
  summary: string | null;
  is_featured: boolean;
  priority: number;
  derived_state: string;
  effective_from: string | null;
  effective_to: string | null;
  registration_start: string | null;
  registration_deadline: string | null;
  quantity: number | null;
  capacity_used: number;
  capacity_remaining: number | null;
  is_unlimited: boolean;
  per_user_limit: number;
  primary_benefit_summary: string | null;
}

export interface MobileVoucherBenefit {
  id?: string;
  title?: string | null;
  description?: string | null;
  value_type?: string | null;
  value?: number | null;
  unit?: string | null;
  highlight?: boolean | null;
  display_order?: number | null;
  [key: string]: unknown;
}

export interface MobileVoucherCondition {
  id?: string;
  title?: string | null;
  description?: string | null;
  required?: boolean | null;
  display_order?: number | null;
  [key: string]: unknown;
}

export interface MobileVoucherAttachment {
  id?: string;
  label?: string | null;
  url?: string | null;
  file_url?: string | null;
  type?: string | null;
  mime_type?: string | null;
  [key: string]: unknown;
}

export interface MobileVoucherRegistrationSummary {
  id: string;
  registration_code: string | null;
  status: string;
  created_at: string;
  can_cancel: boolean;
}

export interface MobileVoucherEligibility {
  eligible: boolean;
  code: string;
  message: string;
  derived_state?: string | null;
  capacity?: number | null;
  registration_count?: number | null;
  remaining?: number | null;
  user_registration_count?: number | null;
}

export interface MobileVoucherApplicability {
  scope: "project_wide" | "product_types" | "specific_products" | "sales_policies" | "mixed";
  product_types: Array<{ id: string; name: string }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  policies: Array<{ id: string; title: string }>;
  applies_to_current_product: boolean | null;
  applies_to_current_policy: boolean | null;
}

export interface MobileVoucherDetail {
  voucher: {
    id: string;
    project_id: string;
    title: string;
    slug: string | null;
    code: string | null;
    summary: string | null;
    is_featured: boolean;
    priority: number;
    derived_state: string;
    effective_from: string | null;
    effective_to: string | null;
    registration_start: string | null;
    registration_deadline: string | null;
    quantity: number | null;
    capacity_used: number;
    capacity_remaining: number | null;
    is_unlimited: boolean;
    per_user_limit: number;
    published_at: string | null;
    value_amount: number | null;
    value_percent: number | null;
  };
  project: {
    id: string;
    code: string | null;
    name: string;
    cover_url: string | null;
  } | null;
  benefits: MobileVoucherBenefit[];
  conditions: MobileVoucherCondition[];
  attachments: MobileVoucherAttachment[];
  applicability_summary: MobileVoucherApplicability;
  eligibility: MobileVoucherEligibility;
  my_registration_state: {
    active_registration_count: number;
    total_registration_count: number;
    per_user_limit: number;
    remaining_user_quota: number;
    registrations: MobileVoucherRegistrationSummary[];
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
export function mapMobileVoucherError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  const map: Record<string, string> = {
    permission_denied: "Bạn không có quyền thao tác voucher này.",
    voucher_not_found: "Không tìm thấy voucher.",
    voucher_not_available: "Voucher chưa được công bố hoặc đã bị lưu trữ.",
    voucher_archived: "Voucher đã bị lưu trữ.",
    voucher_not_active: "Voucher chưa phát hành.",
    voucher_paused: "Voucher đang tạm dừng.",
    voucher_expired: "Voucher đã hết hạn.",
    voucher_registration_not_open: "Voucher chưa mở đăng ký.",
    voucher_registration_closed: "Voucher đã đóng đăng ký.",
    voucher_full: "Voucher đã hết số lượng.",
    voucher_user_limit_reached: "Bạn đã đạt giới hạn đăng ký cho voucher này.",
    duplicate_voucher_registration: "Bạn đã đăng ký voucher này.",
    voucher_not_applicable: "Voucher không áp dụng cho ngữ cảnh này.",
    voucher_product_project_mismatch: "Sản phẩm không thuộc dự án của voucher.",
    voucher_policy_project_mismatch: "Chính sách không thuộc dự án của voucher.",
    voucher_profile_incomplete: "Cần cập nhật họ tên và số điện thoại trước khi đăng ký.",
    product_not_found: "Không tìm thấy sản phẩm.",
    registration_not_cancellable: "Không thể huỷ đăng ký này.",
    not_found: "Không tìm thấy đăng ký.",
  };
  if (map[code]) return map[code];
  if (raw.includes("permission")) return "Bạn không có quyền thực hiện thao tác này.";
  return "Không thể tải voucher. Vui lòng thử lại.";
}

function assertMobileVoucherDetailShape(v: unknown): asserts v is MobileVoucherDetail {
  if (!v || typeof v !== "object") throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  const o = v as Record<string, unknown>;
  const vv = o.voucher as Record<string, unknown> | null;
  if (!vv || typeof vv !== "object" || typeof vv.id !== "string" || typeof vv.title !== "string") {
    throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  }
  if (!Array.isArray(o.benefits) || !Array.isArray(o.conditions) || !Array.isArray(o.attachments)) {
    throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  }
  if (!o.applicability_summary || typeof o.applicability_summary !== "object") {
    throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  }
  if (!o.eligibility || typeof o.eligibility !== "object") {
    throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  }
  if (!o.my_registration_state || typeof o.my_registration_state !== "object") {
    throw new ServiceError("Dữ liệu voucher không hợp lệ.");
  }
}

// ---------------------------------------------------------------------------
// RPC wrappers
// ---------------------------------------------------------------------------
export interface MobileVoucherSearchArgs {
  projectId?: string | null;
  query?: string | null;
  featured?: boolean | null;
  registrationState?: MobileVoucherRegistrationState | null;
  limit?: number;
  offset?: number;
}

export async function searchMobileVouchers(
  args: MobileVoucherSearchArgs = {},
): Promise<MobileVoucherListItem[]> {
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const res = await supabase.rpc("search_mobile_vouchers" as never, {
    p_project_id: args.projectId ?? null,
    p_query: args.query ?? null,
    p_featured: args.featured ?? null,
    p_registration_state: args.registrationState ?? null,
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (res.error) throw new ServiceError(mapMobileVoucherError(res.error), res.error);
  return (res.data as unknown as MobileVoucherListItem[] | null) ?? [];
}

export async function getMobileVoucherDetail(
  voucherId: string,
  ctx: { productId?: string | null; policyId?: string | null } = {},
): Promise<MobileVoucherDetail> {
  const res = await supabase.rpc("get_mobile_voucher_detail" as never, {
    p_voucher_id: voucherId,
    p_product_id: ctx.productId ?? null,
    p_policy_id: ctx.policyId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapMobileVoucherError(res.error), res.error);
  const data = res.data as unknown;
  assertMobileVoucherDetailShape(data);
  return data;
}

export async function registerForMobileVoucher(
  voucherId: string,
  ctx: {
    productId?: string | null;
    productTypeId?: string | null;
    policyId?: string | null;
    note?: string | null;
  } = {},
): Promise<{
  registration_id: string;
  registration_code: string | null;
  status: string;
  remaining: number | null;
}> {
  const res = await supabase.rpc("register_for_voucher" as never, {
    p_voucher_id: voucherId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_note: ctx.note ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapMobileVoucherError(res.error), res.error);
  return res.data as unknown as {
    registration_id: string;
    registration_code: string | null;
    status: string;
    remaining: number | null;
  };
}

export async function cancelMyMobileVoucherRegistration(
  registrationId: string,
): Promise<{ registration_id: string; status: string }> {
  const res = await supabase.rpc("cancel_my_voucher_registration" as never, {
    p_registration_id: registrationId,
  } as never);
  if (res.error) throw new ServiceError(mapMobileVoucherError(res.error), res.error);
  return res.data as unknown as { registration_id: string; status: string };
}