import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "./_helpers";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];

export async function listEvents(projectId?: string | null): Promise<EventRow[]> {
  let q = supabase
    .from("events")
    .select("*")
    .is("archived_at", null)
    .in("status", ["active", "draft"])
    .order("start_at", { ascending: true });
  if (projectId) q = q.eq("project_id", projectId);
  return unwrap(await q, "events.list");
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const res = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "events.get");
}