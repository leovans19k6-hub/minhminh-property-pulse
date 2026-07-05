import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";
import type { MobileInventoryItem } from "./inventory.service";

export interface MobileFavoriteItem extends MobileInventoryItem {
  favorited_at: string;
}

export interface MobileFavoritesPage {
  items: MobileFavoriteItem[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

function mapErr(msg: string): string {
  if (msg.includes("permission_denied")) return "Bạn không có quyền thực hiện thao tác này.";
  return "Không thể cập nhật danh sách yêu thích. Vui lòng thử lại.";
}

export async function getMobileFavorites(
  limit = 30,
  offset = 0,
): Promise<MobileFavoritesPage> {
  const res = await supabase.rpc("get_mobile_favorites" as never, {
    p_limit: limit,
    p_offset: offset,
  } as never);
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
  return res.data as unknown as MobileFavoritesPage;
}

export async function addMobileFavorite(productId: string): Promise<void> {
  const res = await supabase.rpc("add_mobile_favorite" as never, {
    p_product_id: productId,
  } as never);
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
}

export async function removeMobileFavorite(productId: string): Promise<void> {
  const res = await supabase.rpc("remove_mobile_favorite" as never, {
    p_product_id: productId,
  } as never);
  if (res.error) throw new ServiceError(mapErr(res.error.message), res.error);
}