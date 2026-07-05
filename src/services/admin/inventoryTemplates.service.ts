import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type TemplateRow = Database["public"]["Tables"]["inventory_templates"]["Row"];
export type TemplateInsert = Database["public"]["Tables"]["inventory_templates"]["Insert"];
export type TemplateUpdate = Database["public"]["Tables"]["inventory_templates"]["Update"];
export type TemplateFieldRow = Database["public"]["Tables"]["inventory_template_fields"]["Row"];
export type TemplateFieldInsert = Database["public"]["Tables"]["inventory_template_fields"]["Insert"];
export type TemplateViewRow = Database["public"]["Tables"]["inventory_template_views"]["Row"];
export type TemplateViewInsert = Database["public"]["Tables"]["inventory_template_views"]["Insert"];

export const TEMPLATE_CODE_REGEX = /^[a-z][a-z0-9_]{0,62}$/;

export function validateTemplateCode(code: string): string | null {
  if (!code) return "Bắt buộc";
  if (!TEMPLATE_CODE_REGEX.test(code)) return "Chỉ dùng chữ thường, số, gạch dưới; bắt đầu bằng chữ.";
  return null;
}

export interface ListTemplateFilters {
  category?: string | null;
  includeArchived?: boolean;
}

export async function listTemplates(filters: ListTemplateFilters = {}): Promise<TemplateRow[]> {
  let q = supabase.from("inventory_templates").select("*").order("name", { ascending: true });
  if (filters.category) q = q.eq("project_category", filters.category);
  if (!filters.includeArchived) q = q.eq("status", "active");
  return unwrap(await q, "templates.list");
}

export async function getTemplate(id: string): Promise<TemplateRow | null> {
  return unwrapMaybe<TemplateRow>(
    await supabase.from("inventory_templates").select("*").eq("id", id).maybeSingle(),
    "templates.get",
  );
}

export async function createTemplate(input: TemplateInsert): Promise<TemplateRow> {
  const err = validateTemplateCode(input.code);
  if (err) throw new ServiceError(err);
  return unwrap(
    await supabase.from("inventory_templates").insert(input).select("*").single(),
    "templates.create",
  );
}

export async function updateTemplate(id: string, patch: TemplateUpdate): Promise<TemplateRow> {
  if (patch.code) {
    const err = validateTemplateCode(patch.code);
    if (err) throw new ServiceError(err);
  }
  return unwrap(
    await supabase.from("inventory_templates").update(patch).eq("id", id).select("*").single(),
    "templates.update",
  );
}

export async function setTemplateStatus(id: string, status: "active" | "archived") {
  const res = await supabase.from("inventory_templates").update({ status }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/* -------- Template fields -------- */
export async function listTemplateFields(templateId: string): Promise<TemplateFieldRow[]> {
  return unwrap(
    await supabase
      .from("inventory_template_fields")
      .select("*")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true })
      .order("field_label", { ascending: true }),
    "templates.fields.list",
  );
}

export async function createTemplateField(input: TemplateFieldInsert): Promise<TemplateFieldRow> {
  return unwrap(
    await supabase.from("inventory_template_fields").insert(input).select("*").single(),
    "templates.fields.create",
  );
}

export async function updateTemplateField(
  id: string,
  patch: Database["public"]["Tables"]["inventory_template_fields"]["Update"],
): Promise<TemplateFieldRow> {
  return unwrap(
    await supabase.from("inventory_template_fields").update(patch).eq("id", id).select("*").single(),
    "templates.fields.update",
  );
}

export async function deleteTemplateField(id: string) {
  const res = await supabase.from("inventory_template_fields").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/* -------- Template views -------- */
export async function listTemplateViews(templateId: string): Promise<TemplateViewRow[]> {
  return unwrap(
    await supabase
      .from("inventory_template_views")
      .select("*")
      .eq("template_id", templateId)
      .order("display_order", { ascending: true }),
    "templates.views.list",
  );
}

export async function createTemplateView(input: TemplateViewInsert): Promise<TemplateViewRow> {
  return unwrap(
    await supabase.from("inventory_template_views").insert(input).select("*").single(),
    "templates.views.create",
  );
}

export async function deleteTemplateView(id: string) {
  const res = await supabase.from("inventory_template_views").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/* -------- Apply / snapshot -------- */
export interface ApplyResult {
  fields_created: number;
  fields_updated: number;
  fields_skipped: number;
  views_created: number;
  views_updated: number;
  views_skipped: number;
}

export async function applyTemplate(
  templateId: string,
  projectId: string,
  options: { overwrite?: boolean; includeFields?: boolean; includeViews?: boolean } = {},
): Promise<ApplyResult> {
  const res = await supabase.rpc("apply_inventory_template", {
    p_template_id: templateId,
    p_project_id: projectId,
    p_overwrite: options.overwrite ?? false,
    p_include_fields: options.includeFields ?? true,
    p_include_views: options.includeViews ?? true,
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as ApplyResult;
}

export async function snapshotTemplateFromProject(input: {
  projectId: string;
  code: string;
  name: string;
  description?: string | null;
  projectCategory?: string | null;
}): Promise<string> {
  const err = validateTemplateCode(input.code);
  if (err) throw new ServiceError(err);
  const res = await supabase.rpc("snapshot_template_from_project", {
    p_project_id: input.projectId,
    p_code: input.code,
    p_name: input.name,
    p_description: input.description ?? undefined,
    p_project_category: input.projectCategory ?? undefined,
  });
  if (res.error) throw new ServiceError(res.error.message, res.error);
  return res.data as unknown as string;
}