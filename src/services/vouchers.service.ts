import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "./_helpers";
import { mapVoucherError, type EligibilityResult } from "./admin/vouchers.service";

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

// Mobile-ready RPCs (Phase 6B)
export async function getActiveProjectVouchers(
  projectId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null } = {},
): Promise<Array<Record<string, unknown>>> {
  const res = await supabase.rpc("get_active_project_vouchers" as never, {
    p_project_id: projectId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_limit: 50, p_offset: 0,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  const data = res.data as unknown as { rows: Array<Record<string, unknown>> } | null;
  return data?.rows ?? [];
}

export async function getActiveVoucherDetail(
  voucherId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null } = {},
): Promise<Record<string, unknown>> {
  const res = await supabase.rpc("get_active_voucher_detail" as never, {
    p_voucher_id: voucherId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as Record<string, unknown>;
}

export async function checkVoucherEligibility(
  voucherId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null } = {},
): Promise<EligibilityResult> {
  const res = await supabase.rpc("check_voucher_eligibility" as never, {
    p_voucher_id: voucherId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as EligibilityResult;
}

export async function registerForVoucher(
  voucherId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null; note?: string | null } = {},
): Promise<{ registration_id: string; registration_code: string; status: string; remaining: number | null }> {
  const res = await supabase.rpc("register_for_voucher" as never, {
    p_voucher_id: voucherId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_note: ctx.note ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data as unknown as { registration_id: string; registration_code: string; status: string; remaining: number | null };
}

export async function cancelMyVoucherRegistration(registrationId: string) {
  const res = await supabase.rpc("cancel_my_voucher_registration" as never, {
    p_registration_id: registrationId,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  return res.data;
}

export async function getMyVoucherRegistrations(
  args: { projectId?: string | null; status?: string | null; limit?: number; offset?: number } = {},
): Promise<Array<Record<string, unknown>>> {
  const res = await supabase.rpc("get_my_voucher_registrations" as never, {
    p_project_id: args.projectId ?? null,
    p_status: args.status ?? null,
    p_limit: args.limit ?? 50,
    p_offset: args.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapVoucherError(res.error), res.error);
  const data = res.data as unknown as { rows: Array<Record<string, unknown>> } | null;
  return data?.rows ?? [];
}