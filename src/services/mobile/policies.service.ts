import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export interface MobilePolicyListItem {
  id: string;
  project_id: string;
  project_name: string | null;
  project_code: string | null;
  title: string;
  slug: string;
  summary: string | null;
  is_featured: boolean;
  priority: number;
  effective_from: string | null;
  effective_to: string | null;
  registration_deadline: string | null;
  published_at: string | null;
}

export interface MobilePolicyAttachment {
  id?: string;
  label?: string | null;
  file_name?: string | null;
  url?: string | null;
  file_url?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  [key: string]: unknown;
}

export interface MobilePolicyContentSection {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  content?: string | null;
  note?: string | null;
  highlight?: string | null;
  items?: string[] | null;
  [key: string]: unknown;
}

export interface MobilePolicyApplicability {
  scope: "project_wide" | "product_types" | "products" | "mixed";
  product_types: Array<{ id: string; name: string }>;
  products: Array<{ id: string; product_code: string; product_name: string | null }>;
  applies_to_current_product: boolean | null;
}

export interface MobilePolicyDetail {
  policy: {
    id: string;
    project_id: string;
    title: string;
    slug: string;
    summary: string | null;
    effective_from: string | null;
    effective_to: string | null;
    registration_deadline: string | null;
    is_featured: boolean;
    priority: number;
    published_at: string | null;
    version_number: number | null;
    derived_effective_status: "effective" | "upcoming" | "expired";
  };
  project: {
    id: string;
    code: string | null;
    name: string;
    slug: string | null;
    cover_url: string | null;
    location_text: string | null;
  } | null;
  content_sections: MobilePolicyContentSection[];
  attachments: MobilePolicyAttachment[];
  applicability_summary: MobilePolicyApplicability;
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

function mapErr(msg: string): string {
  if (msg.includes("permission_denied")) return "Bạn không có quyền xem chính sách này.";
  if (msg.includes("policy_not_found")) return "Không tìm thấy chính sách.";
  if (msg.includes("policy_not_available")) return "Chính sách này chưa được công bố hoặc đã bị lưu trữ.";
  if (msg.includes("policy_not_effective")) return "Chính sách này không còn trong thời gian áp dụng.";
  if (msg.includes("policy_not_applicable")) return "Chính sách này không áp dụng cho sản phẩm bạn chọn.";
  if (msg.includes("product_project_mismatch")) return "Sản phẩm không thuộc dự án của chính sách này.";
  if (msg.includes("product_not_found")) return "Không tìm thấy sản phẩm.";
  return "Không thể tải chính sách. Vui lòng thử lại.";
}

function assertPolicyDetailShape(v: unknown): asserts v is MobilePolicyDetail {
  if (!v || typeof v !== "object") throw new ServiceError("Dữ liệu chính sách không hợp lệ.");
  const o = v as Record<string, unknown>;
  const p = o.policy as Record<string, unknown> | null;
  if (!p || typeof p !== "object" || typeof p.id !== "string" || typeof p.title !== "string") {
    throw new ServiceError("Dữ liệu chính sách không hợp lệ.");
  }
  if (!Array.isArray(o.content_sections) || !Array.isArray(o.attachments)) {
    throw new ServiceError("Dữ liệu chính sách không hợp lệ.");
  }
  if (!o.applicability_summary || typeof o.applicability_summary !== "object") {
    throw new ServiceError("Dữ liệu chính sách không hợp lệ.");
  }
}

export interface MobilePolicySearchArgs {
  projectId?: string | null;
  query?: string | null;
  featured?: boolean | null;
  limit?: number;
  offset?: number;
}

export async function searchMobilePolicies(
  args: MobilePolicySearchArgs = {},
): Promise<MobilePolicyListItem[]> {
  const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
  const offset = Math.max(args.offset ?? 0, 0);
  const res = await supabase.rpc("search_mobile_policies", {
    p_project_id: args.projectId ?? null,
    p_query: args.query ?? null,
    p_featured: args.featured ?? null,
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return (res.data as unknown as MobilePolicyListItem[] | null) ?? [];
}

export async function getMobilePolicyDetail(
  policyId: string,
  productId?: string | null,
): Promise<MobilePolicyDetail> {
  const res = await supabase.rpc("get_mobile_policy_detail", {
    p_policy_id: policyId,
    p_product_id: productId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  const data = res.data as unknown;
  assertPolicyDetailShape(data);
  return data;
}