import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export interface MobileProductMedia {
  id: string;
  media_type: string;
  file_url: string;
  thumbnail_url: string | null;
  title: string | null;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface MobileProductPriceOption {
  id: string;
  price_code: string;
  price_name: string;
  amount: number;
  currency: string;
  price_per_sqm: number | null;
  is_primary: boolean;
  status: string;
  effective_from: string | null;
  effective_to: string | null;
}

export interface MobileProductCustomField {
  definition_id: string;
  field_key: string;
  label: string;
  field_group: string | null;
  data_type: string;
  unit: string | null;
  help_text: string | null;
  display_order: number;
  value: unknown;
  display_value: string | null;
}

export interface MobileProductPriceHistorySummary {
  can_view: boolean;
  has_history?: boolean;
  change_count?: number;
  latest_change_at?: string | null;
  previous_primary_price?: number | null;
  current_primary_price?: number | null;
  absolute_change?: number | null;
  percentage_change?: number | null;
  trend?: "up" | "down" | "unchanged" | "unknown";
}

export interface MobileProductStatusHistorySummary {
  can_view: boolean;
  change_count?: number;
  latest_change_at?: string | null;
  latest_status?: string | null;
  previous_status?: string | null;
}

export interface MobilePolicyPreview {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  effective_from: string | null;
  effective_to: string | null;
  registration_deadline: string | null;
  is_featured: boolean;
  priority: number;
}

export interface MobileVoucherPreview {
  id: string;
  slug: string;
  code: string | null;
  title: string;
  summary: string | null;
  effective_from: string | null;
  effective_to: string | null;
  registration_start: string | null;
  quantity: number | null;
  registered_count: number | null;
  priority: number;
  is_featured: boolean;
  derived_state?: string | null;
  voucher_type?: string | null;
  value_amount?: number | null;
  value_percent?: number | null;
}

export interface MobileEventPreview {
  id: string;
  slug: string;
  title: string;
  event_type: string;
  summary: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  location_type: string | null;
  location_name: string | null;
  priority: number;
  is_featured: boolean;
  derived_state?: string | null;
  registered_count?: number | null;
  capacity?: number | null;
}

export interface MobilePrimaryContact {
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

export interface MobileProductDetail {
  product: {
    id: string;
    project_id: string;
    zone_id: string | null;
    building_id: string | null;
    floor_id: string | null;
    floor_number: number | null;
    product_type_id: string | null;
    product_code: string;
    product_name: string | null;
    external_code: string | null;
    category: string;
    status: string;
    description: string | null;
    direction: string | null;
    door_direction: string | null;
    balcony_direction: string | null;
    view_text: string | null;
    land_area: number | null;
    construction_area: number | null;
    built_up_area: number | null;
    carpet_area: number | null;
    total_floor_area: number | null;
    frontage: number | null;
    depth: number | null;
    number_of_floors: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    unit_type: string | null;
    handover_standard: string | null;
    ownership_type: string | null;
    legal_status: string | null;
    construction_status: string | null;
    featured: boolean;
    updated_at: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
    code: string | null;
    location_text: string | null;
    province: string | null;
    district: string | null;
    thumbnail_url: string | null;
    cover_url: string | null;
    logo_url: string | null;
    project_category: string | null;
    status: string;
  };
  developer: { id: string; name: string; logo_url: string | null } | null;
  zone: { id: string; name: string; code: string } | null;
  building: { id: string; name: string; code: string } | null;
  floor: { id: string; floor_number: number | null; floor_code: string; floor_name: string | null } | null;
  product_type: { id: string; name: string } | null;
  media: MobileProductMedia[];
  price_options: MobileProductPriceOption[];
  custom_fields: MobileProductCustomField[];
  price_history_summary: MobileProductPriceHistorySummary;
  status_history_summary: MobileProductStatusHistorySummary;
  applicable_policies: MobilePolicyPreview[];
  project_vouchers: MobileVoucherPreview[];
  upcoming_events: MobileEventPreview[];
  primary_contact: MobilePrimaryContact | null;
  permissions: {
    is_favorite: boolean;
    can_view_history: boolean;
  };
}

function mapErr(msg: string): string {
  if (msg.includes("permission_denied")) return "Bạn không có quyền xem sản phẩm này.";
  if (msg.includes("product_not_found")) return "Không tìm thấy sản phẩm.";
  return "Không thể tải sản phẩm. Vui lòng thử lại.";
}

function assertProductDetailShape(v: unknown): asserts v is MobileProductDetail {
  if (!v || typeof v !== "object") throw new ServiceError("Không thể tải sản phẩm. Vui lòng thử lại.");
  const o = v as Record<string, unknown>;
  const required = [
    "product",
    "project",
    "media",
    "price_options",
    "custom_fields",
    "price_history_summary",
    "status_history_summary",
    "applicable_policies",
    "project_vouchers",
    "upcoming_events",
    "permissions",
  ] as const;
  for (const k of required) {
    if (!(k in o)) throw new ServiceError("Dữ liệu sản phẩm không hợp lệ.");
  }
  const arrays = ["media", "price_options", "custom_fields", "applicable_policies", "project_vouchers", "upcoming_events"] as const;
  for (const k of arrays) {
    if (!Array.isArray(o[k])) throw new ServiceError("Dữ liệu sản phẩm không hợp lệ.");
  }
  const p = o.product as Record<string, unknown> | null;
  if (!p || typeof p !== "object" || typeof p.id !== "string" || typeof p.project_id !== "string") {
    throw new ServiceError("Dữ liệu sản phẩm không hợp lệ.");
  }
}

export async function getMobileProductDetail(productId: string): Promise<MobileProductDetail> {
  const res = await supabase.rpc("get_mobile_product_detail", {
    p_product_id: productId,
  });
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  const data = res.data as unknown;
  assertProductDetailShape(data);
  return data;
}