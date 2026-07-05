import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "./_helpers";

export async function listFavorites(userId: string): Promise<string[]> {
  const res = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId);
  const rows = unwrap(res, "favorites.list");
  return rows.map((r) => r.product_id);
}

export async function addFavorite(userId: string, productId: string): Promise<void> {
  const res = await supabase
    .from("favorites")
    .insert({ user_id: userId, product_id: productId });
  if (res.error && res.error.code !== "23505") {
    throw new Error(`[favorites.add] ${res.error.message}`);
  }
}

export async function removeFavorite(userId: string, productId: string): Promise<void> {
  const res = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);
  if (res.error) throw new Error(`[favorites.remove] ${res.error.message}`);
}