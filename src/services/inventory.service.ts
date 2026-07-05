import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { InventoryFilters } from "@/lib/queryKeys";
import { unwrap } from "./_helpers";

export type InventorySummaryRow =
  Database["public"]["Views"]["inventory_product_summary"]["Row"];

export async function searchInventory(
  filters: InventoryFilters = {},
): Promise<InventorySummaryRow[]> {
  const res = await supabase.rpc("search_inventory", {
    p_project_id: filters.projectId ?? undefined,
    p_query: filters.query ?? undefined,
    p_category: filters.category ?? undefined,
    p_zone_id: filters.zoneId ?? undefined,
    p_building_id: filters.buildingId ?? undefined,
    p_product_type_id: filters.productTypeId ?? undefined,
    p_status: filters.status ?? undefined,
    p_floor_min: filters.floorMin ?? undefined,
    p_floor_max: filters.floorMax ?? undefined,
    p_area_min: filters.areaMin ?? undefined,
    p_area_max: filters.areaMax ?? undefined,
    p_price_min: filters.priceMin ?? undefined,
    p_price_max: filters.priceMax ?? undefined,
    p_direction: filters.direction ?? undefined,
    p_limit: filters.limit ?? 30,
    p_offset: filters.offset ?? 0,
  });
  return unwrap(res, "inventory.search") as InventorySummaryRow[];
}