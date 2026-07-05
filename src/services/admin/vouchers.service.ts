import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export const VOUCHER_STATUSES = ["draft", "active", "paused", "archived", "inactive"] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];
export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  draft: "Bản nháp",
  active: "Đang phát hành",
  paused: "Tạm dừng",
  archived: "Đã lưu trữ",
  inactive: "Không hoạt động",
};

export const VOUCHER_DERIVED_STATES = [
  "draft","upcoming_registration","open","full","registration_closed",
  "upcoming_validity","valid","expired","paused","archived",
] as const;
export type VoucherDerivedState = (typeof VOUCHER_DERIVED_STATES)[number];
export const VOUCHER_DERIVED_STATE_LABELS: Record<string, string> = {
  draft: "Nháp",
  upcoming_registration: "Sắp mở đăng ký",
  open: "Đang mở",
  full: "Hết chỗ",
  registration_closed: "Đóng đăng ký",
  upcoming_validity: "Sắp hiệu lực",
  valid: "Đang hiệu lực",
  expired: "Đã hết hạn",
  paused: "Tạm dừng",
  archived: "Lưu trữ",
};

export const VOUCHER_APPLICABILITY_SCOPES = [
  "project_wide","product_types","specific_products","sales_policies","mixed",
] as const;
export type VoucherApplicabilityScope = (typeof VOUCHER_APPLICABILITY_SCOPES)[number];

export const VOUCHER_BENEFIT_TYPES = ["percentage","fixed_amount","gift","service","other"] as const;
export type VoucherBenefitType = (typeof VOUCHER_BENEFIT_TYPES)[number];
export const VOUCHER_BENEFIT_TYPE_LABELS: Record<VoucherBenefitType, string> = {
  percentage: "Phần trăm",
  fixed_amount: "Số tiền cố định",
  gift: "Quà tặng",
  service: "Dịch vụ",
  other: "Khác",
};

export interface VoucherBenefit {
  id: string;
  title: string;
  description?: string;
  value_type: VoucherBenefitType;
  value?: number | null;
  unit?: string;
  highlight?: boolean;
  display_order?: number;
}
export interface VoucherCondition {
  id: string;
  title: string;
  description?: string;
  required?: boolean;
  display_order?: number;
}
export interface VoucherAttachment {
  id: string;
  label: string;
  url: string;
  type: "pdf"|"image"|"document"|"spreadsheet"|"link";
}

export interface VoucherListRow {
  id: string; title: string; slug: string; code: string | null;
  status: VoucherStatus; derived_state: VoucherDerivedState;
  registration_start: string | null; registration_deadline: string | null;
  valid_from: string | null; valid_to: string | null;
  capacity: number | null; registration_count: number; remaining: number | null;
  pt_count: number; p_count: number; pol_count: number;
  applicability_scope: VoucherApplicabilityScope;
  is_featured: boolean; priority: number; updated_at: string;
}

export interface VoucherAdminDetail {
  voucher: {
    id: string; project_id: string; title: string; slug: string; code: string | null;
    summary: string | null; content: string | null; voucher_type: string;
    value_amount: number | null; value_percent: number | null;
    effective_from: string | null; effective_to: string | null;
    registration_start: string | null; registration_deadline: string | null;
    quantity: number | null; per_user_limit: number;
    benefits_json: VoucherBenefit[]; conditions_json: VoucherCondition[];
    attachments: VoucherAttachment[];
    is_featured: boolean; priority: number;
    applicability_scope: VoucherApplicabilityScope;
    status: VoucherStatus; archived_at: string | null; published_at: string | null;
    created_at: string; updated_at: string;
  };
  derived_state: VoucherDerivedState;
  project: { id: string; name: string; code: string } | null;
  product_types: Array<{ id: string; name: string; code: string | null }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  policies: Array<{ id: string; title: string; slug: string }>;
  capacity_stats: { capacity: number | null; registration_count: number; remaining: number | null };
  registration_stats: { pending: number; confirmed: number; cancelled: number };
  permissions: { can_manage: boolean };
}

export const VOUCHER_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function validateVoucherSlug(slug: string): string | null {
  if (!slug) return "Bắt buộc";
  if (!VOUCHER_SLUG_REGEX.test(slug)) return "Chỉ chữ thường, số, dấu gạch ngang";
  if (slug.length > 120) return "Tối đa 120 ký tự";
  return null;
}
export function slugify(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").slice(0, 120);
}

export function mapVoucherError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  const map: Record<string, string> = {
    permission_denied: "Không có quyền thao tác voucher.",
    voucher_not_found: "Không tìm thấy voucher.",
    voucher_archived: "Voucher đã bị lưu trữ.",
    voucher_not_archived: "Chỉ khôi phục được voucher đã lưu trữ.",
    voucher_not_active: "Voucher không ở trạng thái phù hợp.",
    voucher_paused: "Voucher đang tạm dừng.",
    voucher_expired: "Voucher đã hết hạn.",
    voucher_full: "Voucher đã hết số lượng.",
    voucher_user_limit_reached: "Bạn đã đạt giới hạn cá nhân cho voucher này.",
    voucher_registration_not_open: "Voucher chưa mở đăng ký.",
    voucher_registration_closed: "Voucher đã đóng đăng ký.",
    voucher_not_applicable: "Voucher không áp dụng cho ngữ cảnh này.",
    voucher_profile_incomplete: "Cần cập nhật họ tên và số điện thoại.",
    duplicate_voucher_slug: "Slug voucher đã tồn tại.",
    duplicate_voucher_code: "Mã voucher đã tồn tại.",
    duplicate_voucher_registration: "Bạn đã đăng ký voucher này.",
    invalid_voucher_dates: "Khoảng ngày không hợp lệ.",
    invalid_voucher_benefits: "Quyền lợi voucher không hợp lệ.",
    too_many_voucher_benefits: "Vượt quá 30 quyền lợi.",
    duplicate_voucher_benefit_id: "Trùng ID quyền lợi.",
    invalid_voucher_conditions: "Điều kiện voucher không hợp lệ.",
    too_many_voucher_conditions: "Vượt quá 50 điều kiện.",
    duplicate_voucher_condition_id: "Trùng ID điều kiện.",
    invalid_voucher_attachment: "Tài liệu đính kèm không hợp lệ.",
    too_many_voucher_attachments: "Vượt quá 20 tài liệu.",
    invalid_voucher_capacity: "Số lượng voucher không hợp lệ.",
    capacity_below_registration_count: "Số lượng nhỏ hơn số đăng ký hiện có.",
    invalid_voucher_product_type: "Loại sản phẩm không thuộc dự án.",
    invalid_voucher_product: "Sản phẩm không thuộc dự án.",
    invalid_voucher_policy: "Chính sách không thuộc dự án.",
    registration_not_cancellable: "Không thể hủy đăng ký này.",
  };
  return map[code] ?? raw;
}

interface SearchArgs {
  projectId: string;
  query?: string | null;
  status?: VoucherStatus | null;
  derivedState?: VoucherDerivedState | null;
  featured?: boolean | null;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}
export async function searchVouchers(a: SearchArgs): Promise<{ rows: VoucherListRow[]; total: number }> {
  const res = await supabase.rpc("search_vouchers" as never, {
    p_project_id: a.projectId, p_query: a.query ?? null,
    p_status: a.status ?? null, p_derived_state: a.derivedState ?? null,
    p_featured: a.featured ?? null, p_include_archived: !!a.includeArchived,
    p_limit: a.limit ?? 50, p_offset: a.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return (res.data as unknown as { rows: VoucherListRow[]; total: number }) ?? { rows: [], total: 0 };
}

export async function getVoucherAdminDetail(voucherId: string): Promise<VoucherAdminDetail> {
  const res = await supabase.rpc("get_voucher_admin_detail" as never, { p_voucher_id: voucherId } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as VoucherAdminDetail;
}

export interface CreateVoucherInput {
  projectId: string;
  voucher: {
    title: string; slug: string; code?: string | null;
    summary?: string | null;
    voucher_type?: string;
    valid_from?: string | null; valid_to?: string | null;
    registration_start?: string | null; registration_deadline?: string | null;
    quantity?: number | null; per_user_limit?: number;
    benefits_json: VoucherBenefit[];
    conditions_json: VoucherCondition[];
    attachments: VoucherAttachment[];
    is_featured?: boolean; priority?: number;
  };
  productTypeIds: string[];
  productIds: string[];
  policyIds: string[];
  publish?: boolean;
}
export async function createVoucher(input: CreateVoucherInput) {
  const res = await supabase.rpc("create_voucher" as never, {
    p_project_id: input.projectId, p_voucher: input.voucher,
    p_product_type_ids: input.productTypeIds,
    p_product_ids: input.productIds,
    p_policy_ids: input.policyIds,
    p_publish: !!input.publish,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as { voucher_id: string; slug: string; code: string | null; status: string };
}

export interface UpdateVoucherInput {
  voucherId: string;
  patch: Partial<CreateVoucherInput["voucher"]>;
  productTypeIds?: string[] | null;
  productIds?: string[] | null;
  policyIds?: string[] | null;
}
export async function updateVoucher(input: UpdateVoucherInput) {
  const res = await supabase.rpc("update_voucher" as never, {
    p_voucher_id: input.voucherId, p_voucher_patch: input.patch,
    p_product_type_ids: input.productTypeIds ?? null,
    p_product_ids: input.productIds ?? null,
    p_policy_ids: input.policyIds ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as { voucher_id: string; changed: boolean };
}

async function callSimple(fn: string, params: Record<string, unknown>) {
  const res = await supabase.rpc(fn as never, params as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data;
}
export const publishVoucher = (id: string) => callSimple("publish_voucher", { p_voucher_id: id });
export const pauseVoucher = (id: string) => callSimple("pause_voucher", { p_voucher_id: id });
export const resumeVoucher = (id: string) => callSimple("resume_voucher", { p_voucher_id: id });
export const archiveVoucher = (id: string, reason?: string | null) =>
  callSimple("archive_voucher", { p_voucher_id: id, p_reason: reason ?? null });
export const restoreVoucher = (id: string) => callSimple("restore_voucher", { p_voucher_id: id });
export const cloneVoucher = (id: string, newSlug: string, newCode?: string | null, newTitle?: string | null) =>
  callSimple("clone_voucher", { p_voucher_id: id, p_new_slug: newSlug, p_new_code: newCode ?? null, p_new_title: newTitle ?? null });

export interface EligibilityResult {
  eligible: boolean; code: string; message: string;
  derived_state?: string; capacity?: number | null;
  registration_count?: number; remaining?: number | null; user_registration_count?: number;
}
export async function checkVoucherEligibility(
  voucherId: string, productId?: string | null, productTypeId?: string | null, policyId?: string | null,
): Promise<EligibilityResult> {
  const res = await supabase.rpc("check_voucher_eligibility" as never, {
    p_voucher_id: voucherId, p_product_id: productId ?? null,
    p_product_type_id: productTypeId ?? null, p_policy_id: policyId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as EligibilityResult;
}