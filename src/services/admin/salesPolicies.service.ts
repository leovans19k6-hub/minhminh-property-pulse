import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

/** Business status stored in DB. `expired` is derived, never stored. */
export const POLICY_STATUSES = ["draft", "active", "archived"] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: "Bản nháp",
  active: "Đang phát hành",
  archived: "Đã lưu trữ",
};

export const POLICY_EFFECTIVE_STATES = ["draft", "upcoming", "effective", "expired", "archived"] as const;
export type PolicyEffectiveState = (typeof POLICY_EFFECTIVE_STATES)[number];
export const POLICY_EFFECTIVE_STATE_LABELS: Record<PolicyEffectiveState, string> = {
  draft: "Nháp",
  upcoming: "Sắp hiệu lực",
  effective: "Đang hiệu lực",
  expired: "Hết hiệu lực",
  archived: "Lưu trữ",
};

export const POLICY_APPLICABILITY_SCOPES = ["project_wide", "product_types", "specific_products"] as const;
export type PolicyApplicabilityScope = (typeof POLICY_APPLICABILITY_SCOPES)[number];

export const ATTACHMENT_TYPES = ["pdf", "image", "document", "spreadsheet", "link"] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export interface PolicySection {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  note?: string;
  highlight?: string;
  items?: { label: string; value: string }[];
  display_order?: number;
}
export interface PolicyContent {
  sections: PolicySection[];
}
export interface PolicyAttachment {
  id: string;
  label: string;
  url: string;
  type: AttachmentType;
}

export interface PolicyRow {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  summary: string | null;
  content_json: PolicyContent;
  attachments: PolicyAttachment[];
  effective_from: string | null;
  effective_to: string | null;
  is_featured: boolean;
  priority: number;
  applicability_scope: PolicyApplicabilityScope;
  status: PolicyStatus;
  version_number: number;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyListRow extends PolicyRow {
  derived_state: PolicyEffectiveState;
  pt_count: number;
  p_count: number;
}

export interface PolicyAdminDetail {
  policy: PolicyRow;
  product_types: Array<{ id: string; name: string; code?: string | null }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  versions: Array<{
    version_number: number;
    change_summary: string | null;
    created_at: string;
    created_by: string | null;
  }>;
  permissions: { can_manage: boolean };
  derived_effective_status: PolicyEffectiveState;
}

export const POLICY_SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export function validatePolicySlug(slug: string): string | null {
  if (!slug) return "Bắt buộc";
  if (!POLICY_SLUG_REGEX.test(slug)) return "Chỉ dùng chữ thường, số, dấu gạch ngang; không bắt đầu/kết thúc bằng dấu.";
  if (slug.length > 120) return "Tối đa 120 ký tự";
  return null;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 120);
}

/** Map raw RPC error → user-facing Vietnamese message. */
export function mapPolicyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  const map: Record<string, string> = {
    permission_denied: "Bạn không có quyền thao tác chính sách này.",
    policy_not_found: "Không tìm thấy chính sách.",
    policy_archived: "Chính sách đã bị lưu trữ.",
    policy_not_archived: "Chỉ khôi phục được chính sách đã lưu trữ.",
    policy_publish_validation_failed: "Chính sách không đủ điều kiện phát hành (kiểm tra ngày và nội dung).",
    duplicate_policy_slug: "Slug đã tồn tại trong dự án.",
    invalid_policy_slug: "Slug không hợp lệ.",
    invalid_policy_content: "Nội dung chính sách không hợp lệ.",
    too_many_policy_sections: "Vượt quá 50 mục nội dung.",
    duplicate_policy_section_id: "Trùng ID mục nội dung.",
    invalid_policy_attachment: "Tài liệu đính kèm không hợp lệ.",
    too_many_policy_attachments: "Vượt quá 20 tài liệu.",
    invalid_policy_dates: "Ngày hết hiệu lực phải lớn hơn hoặc bằng ngày bắt đầu.",
    invalid_policy_product: "Sản phẩm không thuộc dự án.",
    invalid_policy_product_type: "Loại sản phẩm không thuộc dự án.",
    cross_project_policy_reference: "Tham chiếu chéo dự án bị chặn.",
  };
  return map[code] ?? raw;
}

// ---------- RPC wrappers ----------

interface SearchArgs {
  projectId: string;
  query?: string | null;
  status?: PolicyStatus | null;
  effectiveState?: PolicyEffectiveState | null;
  featured?: boolean | null;
  limit?: number;
  offset?: number;
}

export async function searchPolicies(args: SearchArgs): Promise<{ rows: PolicyListRow[]; total: number }> {
  const res = await supabase.rpc("search_sales_policies" as never, {
    p_project_id: args.projectId,
    p_query: args.query ?? null,
    p_status: args.status ?? null,
    p_effective_state: args.effectiveState ?? null,
    p_featured: args.featured ?? null,
    p_limit: args.limit ?? 50,
    p_offset: args.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  const data = res.data as unknown as { rows: PolicyListRow[]; total: number } | null;
  return data ?? { rows: [], total: 0 };
}

export async function getPolicyAdminDetail(policyId: string): Promise<PolicyAdminDetail> {
  const res = await supabase.rpc("get_sales_policy_admin_detail" as never, { p_policy_id: policyId } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as PolicyAdminDetail;
}

export interface CreatePolicyInput {
  projectId: string;
  policy: {
    title: string;
    slug: string;
    summary?: string | null;
    content_json: PolicyContent;
    attachments: PolicyAttachment[];
    effective_from?: string | null;
    effective_to?: string | null;
    is_featured?: boolean;
    priority?: number;
  };
  productTypeIds: string[];
  productIds: string[];
  publish?: boolean;
}

export async function createPolicy(input: CreatePolicyInput): Promise<{ policy_id: string; slug: string; version_number: number }> {
  const res = await supabase.rpc("create_sales_policy" as never, {
    p_project_id: input.projectId,
    p_policy: input.policy,
    p_product_type_ids: input.productTypeIds,
    p_product_ids: input.productIds,
    p_publish: !!input.publish,
  } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as { policy_id: string; slug: string; version_number: number };
}

export interface UpdatePolicyInput {
  policyId: string;
  patch: Partial<CreatePolicyInput["policy"]>;
  productTypeIds?: string[] | null;
  productIds?: string[] | null;
  changeSummary?: string | null;
}

export async function updatePolicy(input: UpdatePolicyInput): Promise<{ policy_id: string; version_number: number; changed: boolean }> {
  const res = await supabase.rpc("update_sales_policy" as never, {
    p_policy_id: input.policyId,
    p_policy_patch: input.patch,
    p_product_type_ids: input.productTypeIds ?? null,
    p_product_ids: input.productIds ?? null,
    p_change_summary: input.changeSummary ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as { policy_id: string; version_number: number; changed: boolean };
}

export async function publishPolicy(policyId: string, changeSummary?: string | null) {
  const res = await supabase.rpc("publish_sales_policy" as never, { p_policy_id: policyId, p_change_summary: changeSummary ?? null } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as { policy_id: string; version_number: number; changed: boolean };
}

export async function unpublishPolicy(policyId: string, changeSummary?: string | null) {
  const res = await supabase.rpc("unpublish_sales_policy" as never, { p_policy_id: policyId, p_change_summary: changeSummary ?? null } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as { policy_id: string; version_number: number; changed: boolean };
}

export async function clonePolicy(policyId: string, newSlug: string, newTitle?: string | null) {
  const res = await supabase.rpc("clone_sales_policy" as never, {
    p_policy_id: policyId, p_new_slug: newSlug, p_new_title: newTitle ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data as unknown as { policy_id: string; slug: string; version_number: number };
}

export async function archivePolicy(policyId: string, reason?: string | null) {
  const res = await supabase.rpc("archive_sales_policy" as never, { p_policy_id: policyId, p_reason: reason ?? null } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data;
}

export async function restorePolicy(policyId: string) {
  const res = await supabase.rpc("restore_sales_policy" as never, { p_policy_id: policyId } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return res.data;
}

/** Version snapshot (readable direct via table SELECT, RLS gated). */
export async function getPolicyVersion(policyId: string, versionNumber: number) {
  const res = await supabase
    .from("sales_policy_versions" as never)
    .select("*")
    .eq("policy_id", policyId as never)
    .eq("version_number", versionNumber as never)
    .maybeSingle();
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as {
    id: string;
    policy_id: string;
    version_number: number;
    snapshot: Record<string, unknown>;
    change_summary: string | null;
    created_by: string | null;
    created_at: string;
  } | null;
}

/** Mobile-ready foundation. */
export async function getActiveProjectPolicies(projectId: string, productId?: string | null, productTypeId?: string | null): Promise<PolicyRow[]> {
  const res = await supabase.rpc("get_active_project_policies" as never, {
    p_project_id: projectId,
    p_product_id: productId ?? null,
    p_product_type_id: productTypeId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapPolicyError(res.error), res.error);
  return (res.data as unknown as PolicyRow[]) ?? [];
}
