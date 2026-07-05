import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe } from "./_helpers";

export type VoucherRow = Database["public"]["Tables"]["vouchers"]["Row"];

export async function listVouchers(projectId?: string | null): Promise<VoucherRow[]> {
  let q = supabase
    .from("vouchers")
    .select("*")
    .is("archived_at", null)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (projectId) q = q.eq("project_id", projectId);
  return unwrap(await q, "vouchers.list");
}

export async function getVoucher(id: string): Promise<VoucherRow | null> {
  const res = await supabase.from("vouchers").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "vouchers.get");
}