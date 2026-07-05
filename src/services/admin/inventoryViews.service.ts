import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type InventoryViewRow = Database["public"]["Tables"]["inventory_views"]["Row"];
export type InventoryViewInsert = Database["public"]["Tables"]["inventory_views"]["Insert"];
export type InventoryViewUpdate = Database["public"]["Tables"]["inventory_views"]["Update"];

export const VIEW_TYPES = ["admin_table", "mobile_list", "mobile_detail", "custom"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  admin_table: "Bảng quản trị",
  mobile_list: "Danh sách (Mobile)",
  mobile_detail: "Chi tiết (Mobile)",
  custom: "Tuỳ chỉnh",
};

export const VIEW_CODE_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

export function validateViewCode(code: string): string | null {
  if (!code) return "Bắt buộc";
  if (!VIEW_CODE_REGEX.test(code)) return "Chỉ dùng chữ thường, số, gạch dưới; bắt đầu bằng chữ.";
  return null;
}

export interface ListViewsFilters {
  viewType?: ViewType | null;
  includeArchived?: boolean;
}

export async function listInventoryViews(
  projectId: string,
  filters: ListViewsFilters = {},
): Promise<InventoryViewRow[]> {
  let q = supabase
    .from("inventory_views")
    .select("*")
    .eq("project_id", projectId)
    .order("view_type", { ascending: true })
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (filters.viewType) q = q.eq("view_type", filters.viewType);
  if (!filters.includeArchived) q = q.eq("status", "active");
  return unwrap(await q, "views.list");
}

export async function getInventoryView(id: string): Promise<InventoryViewRow | null> {
  return unwrapMaybe<InventoryViewRow>(
    await supabase.from("inventory_views").select("*").eq("id", id).maybeSingle(),
    "views.get",
  );
}

export async function createInventoryView(input: InventoryViewInsert): Promise<InventoryViewRow> {
  const codeErr = validateViewCode(input.code);
  if (codeErr) throw new ServiceError(codeErr);
  return unwrap(
    await supabase.from("inventory_views").insert(input).select("*").single(),
    "views.create",
  );
}

export async function updateInventoryView(
  id: string,
  patch: InventoryViewUpdate,
): Promise<InventoryViewRow> {
  if (patch.code) {
    const codeErr = validateViewCode(patch.code);
    if (codeErr) throw new ServiceError(codeErr);
  }
  return unwrap(
    await supabase.from("inventory_views").update(patch).eq("id", id).select("*").single(),
    "views.update",
  );
}

export async function setViewStatus(id: string, status: "active" | "archived") {
  const res = await supabase.from("inventory_views").update({ status }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/** Đặt view làm default cho view_type — bỏ default của các view cùng loại trước. */
export async function setDefaultView(view: InventoryViewRow): Promise<void> {
  const clear = await supabase
    .from("inventory_views")
    .update({ is_default: false })
    .eq("project_id", view.project_id)
    .eq("view_type", view.view_type)
    .neq("id", view.id);
  if (clear.error) throw new ServiceError(clear.error.message, clear.error);
  const set = await supabase
    .from("inventory_views")
    .update({ is_default: true, status: "active" })
    .eq("id", view.id);
  if (set.error) throw new ServiceError(set.error.message, set.error);
}

/** Nhân bản một view sang tên mới, bao gồm toàn bộ cột. */
export async function duplicateInventoryView(
  sourceId: string,
  overrides: { name: string; code: string },
): Promise<InventoryViewRow> {
  // Phase 5E: atomic RPC (validates + copies fields in one transaction).
  const codeErr = validateViewCode(overrides.code);
  if (codeErr) throw new ServiceError(codeErr);
  const res = await supabase.rpc("duplicate_inventory_view", {
    p_source_id: sourceId,
    p_name: overrides.name,
    p_code: overrides.code,
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  const newId = res.data as unknown as string;
  const created = await getInventoryView(newId);
  if (!created) throw new ServiceError("Không đọc được view vừa tạo");
  return created;
}

/** Set default per view_type atomically + sync project_inventory_settings. */
export async function setDefaultViewRpc(viewId: string): Promise<void> {
  const res = await supabase.rpc("set_default_inventory_view", { p_view_id: viewId });
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/** Validate view configuration server-side. */
export async function validateInventoryViewRpc(viewId: string): Promise<{
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  field_count: number;
}> {
  const res = await supabase.rpc("validate_inventory_view", { p_view_id: viewId });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as never;
}

/** Atomic replace of all fields for a view. */
export async function saveInventoryViewFields(
  viewId: string,
  fields: Array<Record<string, unknown>>,
): Promise<number> {
  const res = await supabase.rpc("save_inventory_view_fields", {
    p_view_id: viewId,
    p_fields: fields as unknown as never,
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as number;
}