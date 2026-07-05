import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export interface MobileInventoryItem {
  product_id: string;
  project_id: string;
  project_name: string;
  product_code: string;
  product_name: string | null;
  category: string | null;
  status: string | null;
  product_type_name: string | null;
  zone_name: string | null;
  building_name: string | null;
  floor_number: number | null;
  direction: string | null;
  door_direction: string | null;
  balcony_direction: string | null;
  view_text: string | null;
  land_area: number | null;
  construction_area: number | null;
  built_up_area: number | null;
  carpet_area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  primary_price: number | null;
  primary_price_name: string | null;
  currency: string | null;
  primary_image_url: string | null;
  featured: boolean | null;
  updated_at: string;
}

export interface MobileInventoryPage {
  items: MobileInventoryItem[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface MobileInventoryFilters {
  projectId?: string | null;
  query?: string | null;
  category?: string | null;
  zoneId?: string | null;
  buildingId?: string | null;
  productTypeId?: string | null;
  status?: string | null;
  floorMin?: number | null;
  floorMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  direction?: string | null;
  limit?: number;
  offset?: number;
}

export interface MobileFilterOptions {
  projects: Array<{ id: string; name: string }>;
  zones: Array<{ id: string; name: string; project_id: string }>;
  buildings: Array<{ id: string; name: string; project_id: string; zone_id: string | null }>;
  product_types: Array<{ id: string; name: string; project_id: string }>;
  categories: string[];
  statuses: string[];
  directions: string[];
  floor_min: number | null;
  floor_max: number | null;
  price_min: number | null;
  price_max: number | null;
}

function mapErr(msg: string): string {
  if (msg.includes("permission_denied")) return "Bạn không có quyền tra cứu bảng hàng.";
  return "Không thể tải bảng hàng. Vui lòng thử lại.";
}

export async function searchMobileInventory(
  f: MobileInventoryFilters = {},
): Promise<MobileInventoryPage> {
  const res = await supabase.rpc("search_mobile_inventory", {
    p_project_id: f.projectId ?? undefined,
    p_query: f.query ?? undefined,
    p_category: f.category ?? undefined,
    p_zone_id: f.zoneId ?? undefined,
    p_building_id: f.buildingId ?? undefined,
    p_product_type_id: f.productTypeId ?? undefined,
    p_status: f.status ?? undefined,
    p_floor_min: f.floorMin ?? undefined,
    p_floor_max: f.floorMax ?? undefined,
    p_area_min: f.areaMin ?? undefined,
    p_area_max: f.areaMax ?? undefined,
    p_price_min: f.priceMin ?? undefined,
    p_price_max: f.priceMax ?? undefined,
    p_direction: f.direction ?? undefined,
    p_limit: f.limit ?? 30,
    p_offset: f.offset ?? 0,
  });
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return res.data as unknown as MobileInventoryPage;
}

export async function getMobileInventoryFilters(
  projectId?: string | null,
): Promise<MobileFilterOptions> {
  const res = await supabase.rpc("get_mobile_inventory_filters", {
    p_project_id: projectId ?? undefined,
  });
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return res.data as unknown as MobileFilterOptions;
}