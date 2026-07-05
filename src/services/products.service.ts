import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap } from "./_helpers";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProductPriceOption =
  Database["public"]["Tables"]["product_price_options"]["Row"];

export interface ProductDetail {
  product: ProductRow | null;
  project: Database["public"]["Tables"]["projects"]["Row"] | null;
  zone: Database["public"]["Tables"]["project_zones"]["Row"] | null;
  building: Database["public"]["Tables"]["buildings"]["Row"] | null;
  floor: Database["public"]["Tables"]["floors"]["Row"] | null;
  product_type: Database["public"]["Tables"]["product_types"]["Row"] | null;
  media: Database["public"]["Tables"]["product_media"]["Row"][];
  price_options: ProductPriceOption[];
  policies: Database["public"]["Tables"]["sales_policies"]["Row"][];
  vouchers: Database["public"]["Tables"]["vouchers"]["Row"][];
  primary_contact: Database["public"]["Tables"]["profiles"]["Row"] | null;
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const res = await supabase.rpc("get_product_detail", { p_product_id: productId });
  if (res.error) throw new Error(`[products.detail] ${res.error.message}`);
  return (res.data as unknown as ProductDetail | null) ?? null;
}

export async function listProductPrices(productId: string): Promise<ProductPriceOption[]> {
  const res = await supabase
    .from("product_price_options")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "active")
    .order("is_primary", { ascending: false })
    .order("amount", { ascending: true });
  return unwrap(res, "products.prices");
}