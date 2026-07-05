import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, ServiceError } from "../_helpers";

export type FieldOptionRow = Database["public"]["Tables"]["product_field_options"]["Row"];
export type FieldOptionInsert = Database["public"]["Tables"]["product_field_options"]["Insert"];
export type FieldOptionUpdate = Database["public"]["Tables"]["product_field_options"]["Update"];

export const OPTION_VALUE_REGEX = /^[a-z0-9_\-]{1,64}$/;

export function validateOptionValue(v: string): string | null {
  if (!v) return "Bắt buộc";
  if (!OPTION_VALUE_REGEX.test(v)) return "Chỉ dùng chữ thường, số, gạch dưới hoặc gạch nối (≤64 ký tự).";
  return null;
}

export async function listFieldOptions(fieldId: string, includeArchived = false): Promise<FieldOptionRow[]> {
  let q = supabase
    .from("product_field_options")
    .select("*")
    .eq("field_definition_id", fieldId)
    .order("display_order", { ascending: true })
    .order("option_label", { ascending: true });
  if (!includeArchived) q = q.eq("status", "active");
  return unwrap(await q, "field_options.list");
}

export async function createFieldOption(input: FieldOptionInsert): Promise<FieldOptionRow> {
  const err = validateOptionValue(input.option_value);
  if (err) throw new ServiceError(err);
  return unwrap(
    await supabase.from("product_field_options").insert(input).select("*").single(),
    "field_options.create",
  );
}

export async function updateFieldOption(id: string, patch: FieldOptionUpdate): Promise<FieldOptionRow> {
  return unwrap(
    await supabase.from("product_field_options").update(patch).eq("id", id).select("*").single(),
    "field_options.update",
  );
}

export async function setOptionStatus(id: string, status: "active" | "archived") {
  const res = await supabase.from("product_field_options").update({ status }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function reorderFieldOptions(items: Array<{ id: string; display_order: number }>) {
  for (const it of items) {
    const res = await supabase
      .from("product_field_options")
      .update({ display_order: it.display_order })
      .eq("id", it.id);
    if (res.error) throw new ServiceError(res.error.message, res.error);
  }
}
