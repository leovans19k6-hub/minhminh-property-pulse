# Mobile Events Architecture (Phase 7C.3)

Mobile Events & Site Tours is an additive cutover on top of the canonical Event Engine (Phase 6C / 6C.1). No canonical event RPC was modified.

## Layers

- **Data** — Supabase `events`, `event_sessions`, `event_products`, `event_product_types`, `registrations` (`registration_type IN ('event','site_tour')`).
- **Canonical RPCs (reused, unchanged)** — `register_for_event`, `cancel_my_event_registration`, `check_event_eligibility`, `event_derived_state`, `_event_registration_count`.
- **Mobile RPCs (new, additive)** — `search_mobile_events`, `get_mobile_event_detail`, and an additive `events_preview` array on `get_mobile_project_detail`.
- **Service layer** — `src/services/mobile/events.service.ts` (typed wrappers + VN error mapping + `assertMobileEventDetailShape`).
- **Query layer** — `src/features/events/queries.ts` (`useMobileEvents`, `useMobileEventDetail`, `useRegisterForEvent`, `useCancelMyEventRegistration`).
- **Routes** — `/events` (list), `/events/$eventId` (detail with `productId` / `policyId` / `voucherId` context via search params).
- **Cross-domain entry points** — project detail `events_preview` and product detail event previews link into `/events/$eventId` preserving `productId`.

## Design principles

- Only canonical mutation RPCs perform writes. Mobile UI never writes to `events*` tables directly (RLS denies).
- `search_mobile_events` filters by `accessible_mobile_project_ids()` when no `p_project_id` is provided so a user cannot enumerate events in projects they cannot see.
- `get_mobile_event_detail` returns only the caller's own registrations via `auth.uid()`; other users' registrations are never surfaced (same rule as Phase 6C `get_active_event_detail`).
- Registration and cancellation flows always invalidate the event detail + list + related project/product detail caches to avoid stale eligibility/capacity state.