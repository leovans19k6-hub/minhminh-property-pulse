import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type InventorySettingsRow = Database["public"]["Tables"]["project_inventory_settings"]["Row"];
export type InventorySettingsInsert = Database["public"]["Tables"]["project_inventory_settings"]["Insert"];
export type InventorySettingsUpdate = Database["public"]["Tables"]["project_inventory_settings"]["Update"];

export async function getProjectInventorySettings(projectId: string): Promise<InventorySettingsRow | null> {
  return unwrapMaybe(
    await supabase
      .from("project_inventory_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle(),
    "inventory_settings.get",
  );
}

/** Upsert theo project_id (unique). */
export async function upsertProjectInventorySettings(
  input: InventorySettingsInsert,
): Promise<InventorySettingsRow> {
  return unwrap(
    await supabase
      .from("project_inventory_settings")
      .upsert(input, { onConflict: "project_id" })
      .select("*")
      .single(),
    "inventory_settings.upsert",
  );
}

export async function updateProjectInventorySettings(
  projectId: string,
  patch: InventorySettingsUpdate,
): Promise<InventorySettingsRow> {
  const res = await supabase
    .from("project_inventory_settings")
    .update(patch)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();
  if (res.error) throw new ServiceError(res.error.message, res.error);
  if (!res.data) {
    // chưa có → tạo mới
    return upsertProjectInventorySettings({ project_id: projectId, ...patch } as InventorySettingsInsert);
  }
  return res.data;
}
