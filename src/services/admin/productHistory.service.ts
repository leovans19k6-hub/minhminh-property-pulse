import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap } from "../_helpers";

export type StatusHistoryRow = Database["public"]["Tables"]["product_status_history"]["Row"];
export type PriceHistoryRow = Database["public"]["Tables"]["product_price_history"]["Row"];

export async function listStatusHistory(productId: string): Promise<StatusHistoryRow[]> {
  return unwrap(
    await supabase
      .from("product_status_history")
      .select("*")
      .eq("product_id", productId)
      .order("changed_at", { ascending: false })
      .limit(100),
    "history.status.list",
  );
}

export async function listPriceHistory(productId: string): Promise<PriceHistoryRow[]> {
  return unwrap(
    await supabase
      .from("product_price_history")
      .select("*")
      .eq("product_id", productId)
      .order("changed_at", { ascending: false })
      .limit(100),
    "history.price.list",
  );
}