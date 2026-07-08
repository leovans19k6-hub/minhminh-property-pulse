# Mobile Event Detail Contract (Phase 7C.3)

`public.get_mobile_event_detail(p_event_id, p_product_id, p_product_type_id, p_policy_id, p_voucher_id)` returns a single `jsonb` object with the shape below (or raises a domain error).

## Top-level fields

- `event` — event row projection: `id, project_id, title, slug, event_type, summary, description, start_at, end_at, timezone, location_*, meeting_url, thumbnail_url, cover_url, is_featured, priority, registration_start, registration_deadline, capacity, per_user_limit, applicability_scope, agenda, speakers, attachments, site_tour_details, status`.
- `project` — `{ id, name, code, city, thumbnail_url }`.
- `sessions` — array of `event_sessions` rows.
- `applicability_summary` — `{ scope, product_type_ids[], product_ids[], policy_ids[], voucher_ids[] }`.
- `capacity` — `{ capacity, registration_count, remaining, is_unlimited, per_user_limit, user_registration_count }`.
- `eligibility` — result of canonical `check_event_eligibility` given the request context (product/type/policy/voucher).
- `my_registration_state` — `{ can_register, can_cancel, cancellation_registration_id, active_registration?: {...} }`; other users' registrations are never returned.
- `primary_contact` — resolved via `_resolve_mobile_primary_contact` (whitelisted columns only).
- `derived_state` — from `event_derived_state`.

## Runtime guard

`assertMobileEventDetailShape` in `src/services/mobile/events.service.ts` validates the top-level shape and throws a friendly `ServiceError` on malformed / null payloads.

## Site tour variant

When `event.event_type = 'site_tour'`, `site_tour_details` is populated (meeting point, transport, itinerary hints); the mobile UI renders `EventSiteTourCard`.