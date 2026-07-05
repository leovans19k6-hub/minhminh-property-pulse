import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, ServiceError } from "../_helpers";

export type ViewFieldRow = Database["public"]["Tables"]["inventory_view_fields"]["Row"];
export type ViewFieldInsert = Database["public"]["Tables"]["inventory_view_fields"]["Insert"];
export type ViewFieldUpdate = Database["public"]["Tables"]["inventory_view_fields"]["Update"];

/** Danh sách core field keys mà UI cho phép chọn khi cấu hình View. */
export const CORE_FIELD_KEY_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "product_code", label: "Mã SP" },
  { key: "product_name", label: "Tên SP" },
  { key: "category", label: "Loại (category)" },
  { key: "status", label: "Trạng thái" },
  { key: "featured", label: "Nổi bật" },
  { key: "external_code", label: "Mã ngoài" },
  { key: "description", label: "Mô tả" },
  { key: "handover_standard", label: "Chuẩn bàn giao" },
  { key: "ownership_type", label: "Hình thức sở hữu" },
  { key: "legal_status", label: "Pháp lý" },
  { key: "release_date", label: "Ngày mở bán" },
  { key: "land_area", label: "Diện tích đất" },
  { key: "construction_area", label: "Diện tích xây dựng" },
  { key: "total_floor_area", label: "Tổng diện tích sàn" },
  { key: "frontage", label: "Mặt tiền" },
  { key: "depth", label: "Chiều sâu" },
  { key: "number_of_floors", label: "Số tầng" },
  { key: "direction", label: "Hướng" },
  { key: "construction_status", label: "Tình trạng XD" },
  { key: "carpet_area", label: "Diện tích thông thuỷ" },
  { key: "built_up_area", label: "Diện tích tim tường" },
  { key: "floor_number", label: "Tầng số" },
  { key: "unit_type", label: "Loại căn" },
  { key: "door_direction", label: "Hướng cửa" },
  { key: "balcony_direction", label: "Hướng ban công" },
  { key: "view_text", label: "View" },
  { key: "bedrooms", label: "Phòng ngủ" },
  { key: "bathrooms", label: "Phòng tắm" },
];

export async function listViewFields(viewId: string): Promise<ViewFieldRow[]> {
  return unwrap(
    await supabase
      .from("inventory_view_fields")
      .select("*")
      .eq("inventory_view_id", viewId)
      .order("display_order", { ascending: true }),
    "viewFields.list",
  );
}

export async function addViewField(input: ViewFieldInsert): Promise<ViewFieldRow> {
  return unwrap(
    await supabase.from("inventory_view_fields").insert(input).select("*").single(),
    "viewFields.add",
  );
}

export async function updateViewField(
  id: string,
  patch: ViewFieldUpdate,
): Promise<ViewFieldRow> {
  return unwrap(
    await supabase.from("inventory_view_fields").update(patch).eq("id", id).select("*").single(),
    "viewFields.update",
  );
}

export async function removeViewField(id: string) {
  const res = await supabase.from("inventory_view_fields").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function reorderViewFields(items: Array<{ id: string; display_order: number }>) {
  for (const it of items) {
    const res = await supabase
      .from("inventory_view_fields")
      .update({ display_order: it.display_order })
      .eq("id", it.id);
    if (res.error) throw new ServiceError(res.error.message, res.error);
  }
}