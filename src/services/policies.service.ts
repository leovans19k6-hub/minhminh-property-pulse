import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "./_helpers";

export type PolicyRow = Database["public"]["Tables"]["sales_policies"]["Row"];

export async function listPolicies(projectId?: string | null): Promise<PolicyRow[]> {
  let q = supabase
    .from("sales_policies")
    .select("*")
    .is("archived_at", null)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  return unwrap(await q, "policies.list");
}

export async function getPolicy(id: string): Promise<PolicyRow | null> {
  const res = await supabase.from("sales_policies").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "policies.get");
}