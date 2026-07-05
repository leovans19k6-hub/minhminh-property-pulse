import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "../_helpers";

export type DeveloperRow = Database["public"]["Tables"]["developers"]["Row"];
export type DeveloperInsert = Database["public"]["Tables"]["developers"]["Insert"];
export type DeveloperUpdate = Database["public"]["Tables"]["developers"]["Update"];

export async function listDevelopers(): Promise<DeveloperRow[]> {
  const res = await supabase
    .from("developers")
    .select("*")
    .order("name", { ascending: true });
  return unwrap(res, "developers.list");
}

export async function getDeveloper(id: string) {
  const res = await supabase.from("developers").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "developers.get");
}

export async function createDeveloper(input: DeveloperInsert): Promise<DeveloperRow> {
  const res = await supabase.from("developers").insert(input).select("*").single();
  return unwrap(res, "developers.create");
}

export async function updateDeveloper(id: string, patch: DeveloperUpdate): Promise<DeveloperRow> {
  const res = await supabase.from("developers").update(patch).eq("id", id).select("*").single();
  return unwrap(res, "developers.update");
}

export async function archiveDeveloper(id: string) {
  const res = await supabase
    .from("developers")
    .update({ status: "inactive" })
    .eq("id", id);
  if (res.error) throw new Error(res.error.message);
}