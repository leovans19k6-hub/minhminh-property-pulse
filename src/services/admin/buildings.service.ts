import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type BuildingRow = Database["public"]["Tables"]["buildings"]["Row"];
export type BuildingInsert = Database["public"]["Tables"]["buildings"]["Insert"];
export type BuildingUpdate = Database["public"]["Tables"]["buildings"]["Update"];

export async function listProjectBuildings(projectId: string, includeArchived = false) {
  let q = supabase
    .from("buildings")
    .select("*, project_zones(id, name, code)")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (!includeArchived) q = q.is("archived_at", null);
  return unwrap(await q, "buildings.list");
}

export async function getBuilding(id: string) {
  return unwrapMaybe(
    await supabase.from("buildings").select("*").eq("id", id).maybeSingle(),
    "buildings.get",
  );
}

export async function createBuilding(input: BuildingInsert): Promise<BuildingRow> {
  return unwrap(await supabase.from("buildings").insert(input).select("*").single(), "buildings.create");
}

export async function updateBuilding(id: string, patch: BuildingUpdate): Promise<BuildingRow> {
  return unwrap(
    await supabase.from("buildings").update(patch).eq("id", id).select("*").single(),
    "buildings.update",
  );
}

export interface BuildingDependencies {
  floors: number;
  products: number;
}

export async function getBuildingDependencies(buildingId: string): Promise<BuildingDependencies> {
  const [f, p] = await Promise.all([
    supabase.from("floors").select("id", { count: "exact", head: true }).eq("building_id", buildingId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("building_id", buildingId).is("archived_at", null),
  ]);
  if (f.error || p.error) throw new ServiceError("buildings.deps failed");
  return { floors: f.count ?? 0, products: p.count ?? 0 };
}

export async function archiveBuilding(id: string) {
  const deps = await getBuildingDependencies(id);
  if (deps.floors + deps.products > 0) {
    throw new ServiceError(
      `Tòa nhà đang được sử dụng bởi ${deps.floors} tầng và ${deps.products} sản phẩm.`,
    );
  }
  const res = await supabase
    .from("buildings")
    .update({ archived_at: new Date().toISOString(), status: "inactive" })
    .eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}