import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type ZoneRow = Database["public"]["Tables"]["project_zones"]["Row"];
export type ZoneInsert = Database["public"]["Tables"]["project_zones"]["Insert"];
export type ZoneUpdate = Database["public"]["Tables"]["project_zones"]["Update"];

export async function listProjectZones(projectId: string, includeArchived = false) {
  let q = supabase
    .from("project_zones")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (!includeArchived) q = q.is("archived_at", null);
  return unwrap(await q, "zones.list");
}

export async function getProjectZone(id: string) {
  return unwrapMaybe(
    await supabase.from("project_zones").select("*").eq("id", id).maybeSingle(),
    "zones.get",
  );
}

export async function createProjectZone(input: ZoneInsert): Promise<ZoneRow> {
  return unwrap(await supabase.from("project_zones").insert(input).select("*").single(), "zones.create");
}

export async function updateProjectZone(id: string, patch: ZoneUpdate): Promise<ZoneRow> {
  return unwrap(
    await supabase.from("project_zones").update(patch).eq("id", id).select("*").single(),
    "zones.update",
  );
}

export interface ZoneDependencies {
  childZones: number;
  buildings: number;
  products: number;
}

export async function getZoneDependencies(zoneId: string): Promise<ZoneDependencies> {
  const [c, b, p] = await Promise.all([
    supabase.from("project_zones").select("id", { count: "exact", head: true }).eq("parent_zone_id", zoneId).is("archived_at", null),
    supabase.from("buildings").select("id", { count: "exact", head: true }).eq("zone_id", zoneId).is("archived_at", null),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("zone_id", zoneId).is("archived_at", null),
  ]);
  if (c.error || b.error || p.error) throw new ServiceError("zones.deps failed");
  return { childZones: c.count ?? 0, buildings: b.count ?? 0, products: p.count ?? 0 };
}

export async function archiveProjectZone(id: string) {
  const deps = await getZoneDependencies(id);
  if (deps.childZones + deps.buildings + deps.products > 0) {
    throw new ServiceError(
      `Phân khu đang được sử dụng bởi ${deps.childZones} phân khu con, ${deps.buildings} tòa nhà và ${deps.products} sản phẩm.`,
    );
  }
  const res = await supabase
    .from("project_zones")
    .update({ archived_at: new Date().toISOString(), status: "inactive" })
    .eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

/** Ensures parent zone belongs to same project and is not descendant (client-side guard). */
export async function validateZoneParent(
  projectId: string,
  zoneId: string | null,
  parentZoneId: string | null,
): Promise<void> {
  if (!parentZoneId) return;
  if (zoneId && parentZoneId === zoneId) throw new ServiceError("Không thể chọn chính phân khu này làm cha.");
  const p = unwrapMaybe(
    await supabase.from("project_zones").select("id, project_id, parent_zone_id").eq("id", parentZoneId).maybeSingle(),
    "zones.parent",
  );
  if (!p || p.project_id !== projectId) throw new ServiceError("Phân khu cha không thuộc dự án này.");
  // walk ancestors to avoid circular
  if (zoneId) {
    let cur: string | null = p.parent_zone_id;
    while (cur) {
      if (cur === zoneId) throw new ServiceError("Cấu trúc phân khu tạo ra vòng lặp.");
      const next: { parent_zone_id: string | null } | null = unwrapMaybe(
        await supabase.from("project_zones").select("parent_zone_id").eq("id", cur).maybeSingle(),
        "zones.ancestor",
      );
      cur = next?.parent_zone_id ?? null;
    }
  }
}