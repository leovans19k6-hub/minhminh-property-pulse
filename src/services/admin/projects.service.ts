import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "../_helpers";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

export interface ProjectListFilters {
  search?: string;
  developerId?: string;
  category?: string;
  status?: string;
  includeArchived?: boolean;
}

export async function adminListProjects(f: ProjectListFilters = {}) {
  let q = supabase
    .from("projects")
    .select("*, developers(id, name)")
    .order("display_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (!f.includeArchived) q = q.is("archived_at", null);
  if (f.developerId) q = q.eq("developer_id", f.developerId);
  if (f.category) q = q.eq("project_category", f.category);
  if (f.status) q = q.eq("status", f.status);
  if (f.search) q = q.or(`name.ilike.%${f.search}%,code.ilike.%${f.search}%,slug.ilike.%${f.search}%`);
  const res = await q;
  return unwrap(res, "admin.projects.list");
}

export async function adminGetProject(id: string) {
  const res = await supabase
    .from("projects")
    .select("*, developers(id, name)")
    .eq("id", id)
    .maybeSingle();
  return unwrapMaybe(res, "admin.projects.get");
}

export async function adminCreateProject(input: ProjectInsert): Promise<ProjectRow> {
  const res = await supabase.from("projects").insert(input).select("*").single();
  return unwrap(res, "admin.projects.create");
}

export async function adminUpdateProject(id: string, patch: ProjectUpdate): Promise<ProjectRow> {
  const res = await supabase.from("projects").update(patch).eq("id", id).select("*").single();
  return unwrap(res, "admin.projects.update");
}

export async function adminArchiveProject(id: string) {
  const res = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString(), status: "archived" })
    .eq("id", id);
  if (res.error) throw new Error(res.error.message);
}

export async function adminUnarchiveProject(id: string) {
  const res = await supabase
    .from("projects")
    .update({ archived_at: null, status: "active" })
    .eq("id", id);
  if (res.error) throw new Error(res.error.message);
}