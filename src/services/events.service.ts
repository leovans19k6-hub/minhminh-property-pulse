import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, unwrapMaybe, ServiceError } from "./_helpers";
import { mapEventError, type EventEligibilityResult, type EventType } from "./admin/events.service";
export { eventToCalendarData } from "./admin/events.service";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];

export async function listEvents(projectId?: string | null): Promise<EventRow[]> {
  let q = supabase
    .from("events")
    .select("*")
    .is("archived_at", null)
    .in("status", ["active", "draft"])
    .order("start_at", { ascending: true });
  if (projectId) q = q.eq("project_id", projectId);
  return unwrap(await q, "events.list");
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const res = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return unwrapMaybe(res, "events.get");
}

// Mobile-ready RPCs (Phase 6C)
export async function getActiveProjectEvents(
  projectId: string,
  ctx: {
    eventType?: EventType | null;
    productId?: string | null; productTypeId?: string | null;
    policyId?: string | null; voucherId?: string | null;
    startsFrom?: string | null; startsTo?: string | null;
    limit?: number; offset?: number;
  } = {},
): Promise<Array<Record<string, unknown>>> {
  const res = await supabase.rpc("get_active_project_events" as never, {
    p_project_id: projectId,
    p_event_type: ctx.eventType ?? null,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
    p_starts_from: ctx.startsFrom ?? null,
    p_starts_to: ctx.startsTo ?? null,
    p_limit: ctx.limit ?? 50, p_offset: ctx.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  const data = res.data as unknown as { rows: Array<Record<string, unknown>> } | null;
  return data?.rows ?? [];
}

export async function getActiveEventDetail(
  eventId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null; voucherId?: string | null } = {},
): Promise<Record<string, unknown>> {
  const res = await supabase.rpc("get_active_event_detail" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as Record<string, unknown>;
}

export async function checkEventEligibility(
  eventId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null; voucherId?: string | null } = {},
): Promise<EventEligibilityResult> {
  const res = await supabase.rpc("check_event_eligibility" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as EventEligibilityResult;
}

export async function registerForEvent(
  eventId: string,
  ctx: { productId?: string | null; productTypeId?: string | null; policyId?: string | null; voucherId?: string | null; note?: string | null } = {},
): Promise<{ registration_id: string; registration_code: string; status: string; event_id: string; event_type: EventType; remaining: number | null }> {
  const res = await supabase.rpc("register_for_event" as never, {
    p_event_id: eventId,
    p_product_id: ctx.productId ?? null,
    p_product_type_id: ctx.productTypeId ?? null,
    p_policy_id: ctx.policyId ?? null,
    p_voucher_id: ctx.voucherId ?? null,
    p_note: ctx.note ?? null,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data as unknown as { registration_id: string; registration_code: string; status: string; event_id: string; event_type: EventType; remaining: number | null };
}

export async function cancelMyEventRegistration(registrationId: string) {
  const res = await supabase.rpc("cancel_my_event_registration" as never, {
    p_registration_id: registrationId,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  return res.data;
}

export async function getMyEventRegistrations(
  args: { projectId?: string | null; eventType?: EventType | null; status?: string | null; limit?: number; offset?: number } = {},
): Promise<Array<Record<string, unknown>>> {
  const res = await supabase.rpc("get_my_event_registrations" as never, {
    p_project_id: args.projectId ?? null,
    p_event_type: args.eventType ?? null,
    p_status: args.status ?? null,
    p_limit: args.limit ?? 50, p_offset: args.offset ?? 0,
  } as never);
  if (res.error) throw new ServiceError(mapEventError(res.error), res.error);
  const data = res.data as unknown as { rows: Array<Record<string, unknown>> } | null;
  return data?.rows ?? [];
}