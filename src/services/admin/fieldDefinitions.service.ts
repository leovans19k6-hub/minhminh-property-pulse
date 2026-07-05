import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type FieldDefRow = Database["public"]["Tables"]["product_field_definitions"]["Row"];
export type FieldDefInsert = Database["public"]["Tables"]["product_field_definitions"]["Insert"];
export type FieldDefUpdate = Database["public"]["Tables"]["product_field_definitions"]["Update"];

export const FIELD_DATA_TYPES = [
  "text",
  "long_text",
  "integer",
  "decimal",
  "boolean",
  "date",
  "datetime",
  "single_select",
  "multi_select",
  "url",
  "phone",
] as const;
export type FieldDataType = (typeof FIELD_DATA_TYPES)[number];

export const FIELD_DATA_TYPE_LABELS: Record<FieldDataType, string> = {
  text: "Văn bản ngắn",
  long_text: "Văn bản dài",
  integer: "Số nguyên",
  decimal: "Số thập phân",
  boolean: "Đúng/Sai",
  date: "Ngày",
  datetime: "Ngày & giờ",
  single_select: "Danh sách chọn (1)",
  multi_select: "Danh sách chọn (nhiều)",
  url: "URL",
  phone: "Điện thoại",
};

/** snake_case, bắt đầu bằng chữ cái, tối đa 63 ký tự. */
export const FIELD_KEY_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

/** Reserved core keys — mirror trigger `is_reserved_product_field_key`. */
export const RESERVED_FIELD_KEYS = new Set<string>([
  "id","project_id","zone_id","building_id","floor_id","product_type_id",
  "product_code","product_name","category","status","inventory_source",
  "external_code","featured","description","handover_standard","ownership_type",
  "legal_status","release_date","metadata","archived_at","created_at","updated_at",
  "land_area","construction_area","total_floor_area","frontage","depth",
  "number_of_floors","direction","construction_status",
  "carpet_area","built_up_area","floor_number","unit_type","door_direction",
  "balcony_direction","view_text","bedrooms","bathrooms",
]);

export function validateFieldKey(key: string): string | null {
  if (!key) return "Bắt buộc";
  if (!FIELD_KEY_REGEX.test(key)) return "Chỉ dùng chữ thường, số, gạch dưới; bắt đầu bằng chữ.";
  if (RESERVED_FIELD_KEYS.has(key)) return "Trùng với trường lõi hệ thống.";
  return null;
}

export interface ListFieldFilters {
  productTypeId?: string | null;
  includeArchived?: boolean;
}

export async function listFieldDefinitions(
  projectId: string,
  filters: ListFieldFilters = {},
): Promise<FieldDefRow[]> {
  let q = supabase
    .from("product_field_definitions")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true })
    .order("field_label", { ascending: true });
  if (filters.productTypeId !== undefined) {
    if (filters.productTypeId === null) q = q.is("product_type_id", null);
    else q = q.eq("product_type_id", filters.productTypeId);
  }
  if (!filters.includeArchived) q = q.eq("status", "active");
  return unwrap(await q, "fields.list");
}

export async function getFieldDefinition(id: string) {
  return unwrapMaybe(
    await supabase.from("product_field_definitions").select("*").eq("id", id).maybeSingle(),
    "fields.get",
  );
}

export async function createFieldDefinition(input: FieldDefInsert): Promise<FieldDefRow> {
  const keyErr = validateFieldKey(input.field_key);
  if (keyErr) throw new ServiceError(keyErr);
  return unwrap(
    await supabase.from("product_field_definitions").insert(input).select("*").single(),
    "fields.create",
  );
}

export async function updateFieldDefinition(id: string, patch: FieldDefUpdate): Promise<FieldDefRow> {
  // field_key được trigger DB khóa khi đã có dữ liệu — vẫn cho phép server tự chặn.
  return unwrap(
    await supabase.from("product_field_definitions").update(patch).eq("id", id).select("*").single(),
    "fields.update",
  );
}

export async function setFieldStatus(id: string, status: "active" | "archived") {
  const res = await supabase.from("product_field_definitions").update({ status }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function reorderFieldDefinitions(items: Array<{ id: string; display_order: number }>) {
  for (const it of items) {
    const res = await supabase
      .from("product_field_definitions")
      .update({ display_order: it.display_order })
      .eq("id", it.id);
    if (res.error) throw new ServiceError(res.error.message, res.error);
  }
}

/** Đếm số custom values đang tham chiếu — dùng để cảnh báo user khi archive/đổi type. */
export async function countFieldUsage(fieldId: string): Promise<number> {
  const res = await supabase
    .from("product_custom_values")
    .select("id", { count: "exact", head: true })
    .eq("field_definition_id", fieldId);
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.count ?? 0;
}
