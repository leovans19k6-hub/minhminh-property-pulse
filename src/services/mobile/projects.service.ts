import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

export interface MobileProjectSummary {
  id: string;
  code: string | null;
  slug: string | null;
  name: string;
  short_description: string | null;
  location_text: string | null;
  province: string | null;
  district: string | null;
  thumbnail_url: string | null;
  cover_url: string | null;
  logo_url: string | null;
  project_category: string | null;
  status: string;
  is_featured: boolean | null;
  updated_at: string;
  developer_id: string | null;
  developer_name: string | null;
  developer_logo_url: string | null;
  total_products: number | null;
  available_count: number | null;
  holding_count: number | null;
  booked_count: number | null;
  sold_count: number | null;
  last_inventory_update: string | null;
}

export interface MobileProjectDetail {
  project: MobileProjectSummary & Record<string, unknown>;
  developer: { id: string; name: string; logo_url: string | null } | null;
  inventory_stats: {
    total_products: number | null;
    available_count: number | null;
    holding_count: number | null;
    booked_count: number | null;
    sold_count: number | null;
    last_inventory_update: string | null;
  } | null;
  zones: Array<{ id: string; name: string }>;
  buildings: Array<{ id: string; name: string; zone_id: string | null }>;
  product_types: Array<{ id: string; name: string }>;
  featured_products: Array<{
    product_id: string;
    product_code: string;
    product_name: string | null;
    category: string | null;
    status: string | null;
    primary_price: number | null;
    primary_image_url: string | null;
    zone_name: string | null;
    building_name: string | null;
    floor_number: number | null;
    product_type_name: string | null;
    land_area: number | null;
    built_up_area: number | null;
    direction: string | null;
    balcony_direction: string | null;
  }>;
  policies_preview: Array<{
    id: string;
    title: string;
    summary: string | null;
    is_featured: boolean;
    effective_from: string | null;
    effective_to: string | null;
    registration_deadline: string | null;
    priority: number;
  }>;
  vouchers_preview: Array<{
    id: string;
    title: string;
    code: string | null;
    summary: string | null;
    is_featured: boolean;
    derived_state: string;
    registration_deadline: string | null;
    quantity: number | null;
    capacity_remaining: number | null;
    is_unlimited: boolean;
    primary_benefit_summary: string | null;
    priority: number;
  }>;
  events_preview: Array<{
    id: string;
    title: string;
    slug: string;
    event_type: string;
    summary: string | null;
    start_at: string | null;
    end_at: string | null;
    timezone: string | null;
    location_type: string | null;
    location_name: string | null;
    thumbnail_url: string | null;
    is_featured: boolean;
    priority: number;
    derived_state: string;
    registration_deadline: string | null;
    capacity: number | null;
    capacity_remaining: number | null;
    is_unlimited: boolean;
  }>;
  primary_contact: {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    position: string | null;
    branch: string | null;
    department: string | null;
    zalo_url: string | null;
    member_role: string | null;
  } | null;
}

function mapErr(msg: string): string {
  if (msg.includes("permission_denied")) return "Bạn không có quyền truy cập dự án này.";
  if (msg.includes("project_not_found")) return "Không tìm thấy dự án.";
  return "Không thể tải dữ liệu. Vui lòng thử lại.";
}

export async function getMobileProjects(): Promise<MobileProjectSummary[]> {
  const res = await supabase.rpc("get_mobile_projects");
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return (res.data as unknown as MobileProjectSummary[] | null) ?? [];
}

export async function getMobileProjectDetail(projectId: string): Promise<MobileProjectDetail> {
  const res = await supabase.rpc("get_mobile_project_detail", { p_project_id: projectId });
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return res.data as unknown as MobileProjectDetail;
}