import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type FloorRow = Database["public"]["Tables"]["floors"]["Row"];
export type FloorInsert = Database["public"]["Tables"]["floors"]["Insert"];
export type FloorUpdate = Database["public"]["Tables"]["floors"]["Update"];

export async function listBuildingFloors(buildingId: string) {
  return unwrap(
    await supabase
      .from("floors")
      .select("*")
      .eq("building_id", buildingId)
      .order("display_order", { ascending: true })
      .order("floor_number", { ascending: true, nullsFirst: false }),
    "floors.list",
  );
}

export async function createFloor(input: FloorInsert): Promise<FloorRow> {
  return unwrap(await supabase.from("floors").insert(input).select("*").single(), "floors.create");
}

export async function updateFloor(id: string, patch: FloorUpdate): Promise<FloorRow> {
  return unwrap(await supabase.from("floors").update(patch).eq("id", id).select("*").single(), "floors.update");
}

export interface FloorDependencies { products: number }

export async function getFloorDependencies(floorId: string): Promise<FloorDependencies> {
  const r = await supabase.from("products").select("id", { count: "exact", head: true }).eq("floor_id", floorId).is("archived_at", null);
  if (r.error) throw new ServiceError("floors.deps failed");
  return { products: r.count ?? 0 };
}

export async function safeDeleteFloor(id: string) {
  const deps = await getFloorDependencies(id);
  if (deps.products > 0) throw new ServiceError(`Tầng đang chứa ${deps.products} sản phẩm, không thể xóa.`);
  const res = await supabase.from("floors").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function getFloor(id: string) {
  return unwrapMaybe(await supabase.from("floors").select("*").eq("id", id).maybeSingle(), "floors.get");
}

export interface BulkCreateFloorsInput {
  projectId: string;
  buildingId: string;
  startFloor: number;
  endFloor: number;
  excluded: number[];
  codePrefix: string;
  codeSuffix: string;
}

export interface BulkFloorsPreview {
  planned: { floor_number: number; floor_code: string }[];
  duplicates: string[];
  errors: string[];
}

export async function previewBulkCreateFloors(input: BulkCreateFloorsInput): Promise<BulkFloorsPreview> {
  const errors: string[] = [];
  if (!input.buildingId) errors.push("Chưa chọn tòa nhà.");
  if (input.endFloor < input.startFloor) errors.push("Tầng kết thúc phải >= tầng bắt đầu.");
  const excludedSet = new Set(input.excluded);
  const planned: { floor_number: number; floor_code: string }[] = [];
  for (let n = input.startFloor; n <= input.endFloor; n += 1) {
    if (excludedSet.has(n)) continue;
    planned.push({ floor_number: n, floor_code: `${input.codePrefix}${n}${input.codeSuffix}` });
  }
  if (planned.length > 200) errors.push("Không được tạo quá 200 tầng cùng lúc.");

  const duplicates: string[] = [];
  if (input.buildingId && planned.length) {
    const existing = await supabase
      .from("floors")
      .select("floor_code")
      .eq("building_id", input.buildingId);
    if (!existing.error && existing.data) {
      const set = new Set(existing.data.map((r) => r.floor_code));
      planned.forEach((p) => set.has(p.floor_code) && duplicates.push(p.floor_code));
    }
  }
  return { planned, duplicates, errors };
}

export async function bulkCreateFloors(input: BulkCreateFloorsInput) {
  const { data, error } = await supabase.rpc("bulk_create_floors", {
    p_project_id: input.projectId,
    p_building_id: input.buildingId,
    p_start_floor: input.startFloor,
    p_end_floor: input.endFloor,
    p_excluded_floors: input.excluded,
    p_code_prefix: input.codePrefix,
    p_code_suffix: input.codeSuffix,
  });
  if (error) {
    const m = error.message;
    if (m.includes("too_many_floors")) throw new ServiceError("Vượt quá 200 tầng.");
    if (m.includes("duplicate_floor_code")) throw new ServiceError("Một hoặc nhiều mã tầng đã tồn tại.");
    if (m.includes("invalid_range")) throw new ServiceError("Khoảng tầng không hợp lệ.");
    if (m.includes("building_not_in_project")) throw new ServiceError("Tòa nhà không thuộc dự án.");
    if (m.includes("insufficient_privilege")) throw new ServiceError("Bạn không có quyền tạo tầng cho dự án này.");
    throw new ServiceError(m, error);
  }
  return { created: data?.length ?? 0 };
}