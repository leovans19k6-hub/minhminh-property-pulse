import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "../_helpers";

export type ProductTypeRow = Database["public"]["Tables"]["product_types"]["Row"];
export type ProductTypeInsert = Database["public"]["Tables"]["product_types"]["Insert"];
export type ProductTypeUpdate = Database["public"]["Tables"]["product_types"]["Update"];

export async function listGlobalProductTypes() {
  return unwrap(
    await supabase.from("product_types").select("*").is("project_id", null).order("display_order").order("name"),
    "types.global",
  );
}

export async function listProjectProductTypes(projectId: string) {
  return unwrap(
    await supabase.from("product_types").select("*").eq("project_id", projectId).order("display_order").order("name"),
    "types.project",
  );
}

export async function getProductType(id: string) {
  return unwrapMaybe(await supabase.from("product_types").select("*").eq("id", id).maybeSingle(), "types.get");
}

export async function createProductType(input: ProductTypeInsert): Promise<ProductTypeRow> {
  return unwrap(await supabase.from("product_types").insert(input).select("*").single(), "types.create");
}

export async function updateProductType(id: string, patch: ProductTypeUpdate): Promise<ProductTypeRow> {
  return unwrap(await supabase.from("product_types").update(patch).eq("id", id).select("*").single(), "types.update");
}

export interface ProductTypeDependencies { products: number }

export async function getProductTypeDependencies(id: string): Promise<ProductTypeDependencies> {
  const r = await supabase.from("products").select("id", { count: "exact", head: true }).eq("product_type_id", id).is("archived_at", null);
  if (r.error) throw new ServiceError("types.deps failed");
  return { products: r.count ?? 0 };
}

export async function archiveProductType(id: string) {
  // product_types has no archived_at; set status='inactive'
  const res = await supabase.from("product_types").update({ status: "inactive" }).eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function safeDeleteProductType(id: string) {
  const deps = await getProductTypeDependencies(id);
  if (deps.products > 0) throw new ServiceError(`Loại sản phẩm đang được ${deps.products} sản phẩm sử dụng.`);
  const res = await supabase.from("product_types").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}