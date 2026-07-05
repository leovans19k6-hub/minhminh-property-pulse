/**
 * Canonical registration-domain constants (Phase 6C.1).
 *
 * Keep in sync with the SQL predicate `public.is_event_registration_type(text)`
 * and the shared status literals used in `register_for_event` /
 * `register_for_voucher`.
 */

export const EVENT_REGISTRATION_TYPES = ["event", "site_tour"] as const;
export type EventRegistrationType = (typeof EVENT_REGISTRATION_TYPES)[number];

export const VOUCHER_REGISTRATION_TYPES = ["voucher"] as const;
export type VoucherRegistrationType = (typeof VOUCHER_REGISTRATION_TYPES)[number];

export const ALL_REGISTRATION_TYPES = [
  "consultation",
  "voucher",
  "site_tour",
  "event",
] as const;
export type RegistrationType = (typeof ALL_REGISTRATION_TYPES)[number];

/**
 * Statuses that count against event/voucher capacity and per-user limits.
 * MUST match the SQL literals used inside `_event_registration_count`,
 * `_voucher_registration_count`, and the RPC capacity checks.
 */
export const CAPACITY_COUNTING_STATUSES = [
  "new",
  "in_progress",
  "confirmed",
  "completed",
] as const;

/**
 * Statuses a registrant may cancel themselves.
 * MUST match `cancel_my_event_registration` / `cancel_my_voucher_registration`.
 */
export const CANCELLABLE_STATUSES = ["new", "in_progress"] as const;

/**
 * Terminal statuses — no further transitions expected without admin action.
 */
export const TERMINAL_STATUSES = [
  "completed",
  "cancelled",
  "no_show",
  "rejected",
] as const;

export type RegistrationDomain = "event" | "voucher" | "consultation";

export function isEventRegistrationType(t: string | null | undefined): t is EventRegistrationType {
  return t === "event" || t === "site_tour";
}

export function isVoucherRegistrationType(t: string | null | undefined): t is VoucherRegistrationType {
  return t === "voucher";
}

export function getCanonicalRegistrationDomain(t: string | null | undefined): RegistrationDomain | null {
  if (isEventRegistrationType(t)) return "event";
  if (isVoucherRegistrationType(t)) return "voucher";
  if (t === "consultation") return "consultation";
  return null;
}

export function countsAgainstCapacity(status: string | null | undefined): boolean {
  return CAPACITY_COUNTING_STATUSES.includes(status as (typeof CAPACITY_COUNTING_STATUSES)[number]);
}

export function isCancellableByOwner(status: string | null | undefined): boolean {
  return CANCELLABLE_STATUSES.includes(status as (typeof CANCELLABLE_STATUSES)[number]);
}