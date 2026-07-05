import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "./_helpers";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectInventoryStats =
  Database["public"]["Views"]["project_inventory_stats"]["Row"];

export async function listProjects(): Promise<ProjectRow[]> {
  const res = await supabase
    .from("projects")
    .select("*")
    .is("archived_at", null)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
  return unwrap(res, "projects.list");
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  const res = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "projects.get");
}

export async function getProjectStats(id: string): Promise<ProjectInventoryStats | null> {
  const res = await supabase
    .from("project_inventory_stats")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();
  return unwrapMaybe(res, "projects.stats");
}