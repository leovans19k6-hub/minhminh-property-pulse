import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type ProductSummaryRow =
  Database["public"]["Functions"]["search_inventory"]["Returns"][number];

export type ProductCustomValueRow =
  Database["public"]["Tables"]["product_custom_values"]["Row"];

export const PRODUCT_STATUSES = [
  "available",
  "holding",
  "booked",
  "sold",
  "locked",
  "unavailable",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  available: "Sẵn hàng",
  holding: "Đang giữ chỗ",
  booked: "Đã đặt cọc",
  sold: "Đã bán",
  locked: "Khóa",
  unavailable: "Ngừng KD",
};

export const PRODUCT_CATEGORIES = [
  "apartment",
  "villa",
  "townhouse",
  "shophouse",
  "land",
  "office",
  "retail",
  "other",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  apartment: "Căn hộ",
  villa: "Biệt thự",
  townhouse: "Nhà phố",
  shophouse: "Shophouse",
  land: "Đất nền",
  office: "Văn phòng",
  retail: "Thương mại",
  other: "Khác",
};

export interface SearchProductFilters {
  projectId: string;
  query?: string;
  category?: string;
  zoneId?: string;
  buildingId?: string;
  productTypeId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function searchProducts(f: SearchProductFilters): Promise<ProductSummaryRow[]> {
  const args: Database["public"]["Functions"]["search_inventory"]["Args"] = {
    p_project_id: f.projectId,
    p_query: f.query || undefined,
    p_category: f.category || undefined,
    p_zone_id: f.zoneId || undefined,
    p_building_id: f.buildingId || undefined,
    p_product_type_id: f.productTypeId || undefined,
    p_status: f.status || undefined,
    p_limit: f.limit ?? 50,
    p_offset: f.offset ?? 0,
  };
  return unwrap(await supabase.rpc("search_inventory", args), "products.search");
}

export async function getAdminProduct(id: string): Promise<ProductRow | null> {
  return unwrapMaybe<ProductRow>(
    await supabase.from("products").select("*").eq("id", id).maybeSingle(),
    "products.get",
  );
}

export async function listProductCustomValues(productId: string): Promise<ProductCustomValueRow[]> {
  return unwrap(
    await supabase
      .from("product_custom_values")
      .select("*")
      .eq("product_id", productId),
    "products.customValues.list",
  );
}

export async function createProduct(input: ProductInsert): Promise<ProductRow> {
  if (!input.product_code || !input.project_id || !input.category) {
    throw new ServiceError("Thiếu Mã SP, dự án hoặc loại");
  }
  return unwrap(
    await supabase.from("products").insert(input).select("*").single(),
    "products.create",
  );
}

export async function updateProduct(id: string, patch: ProductUpdate): Promise<ProductRow> {
  return unwrap(
    await supabase.from("products").update(patch).eq("id", id).select("*").single(),
    "products.update",
  );
}

export async function archiveProduct(id: string): Promise<void> {
  const res = await supabase
    .from("products")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function restoreProduct(id: string): Promise<void> {
  const res = await supabase.from("products").update({ archived_at: null }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/** Đầu vào cho RPC `set_product_custom_values`. */
export interface CustomValuePayload {
  field_definition_id: string;
  delete?: boolean;
  value_text?: string | null;
  value_integer?: number | null;
  value_decimal?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_datetime?: string | null;
  value_jsonb?: unknown;
}

export async function setProductCustomValues(
  productId: string,
  values: CustomValuePayload[],
): Promise<void> {
  if (values.length === 0) return;
  const res = await supabase.rpc("set_product_custom_values", {
    p_product_id: productId,
    p_values: values as unknown as Database["public"]["Functions"]["set_product_custom_values"]["Args"]["p_values"],
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
}