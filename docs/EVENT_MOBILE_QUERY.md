# Event Mobile Query (Phase 6C)

Three RPCs power the mobile Sales App (no cutover in Phase 6C — just the foundation):

- `get_active_project_events(project_id, event_type, product_id, product_type_id, policy_id, voucher_id, starts_from, starts_to, limit, offset)`
- `get_active_event_detail(event_id, product_id, product_type_id, policy_id, voucher_id)`
- `get_my_event_registrations(project_id, event_type, status, limit, offset)`

## Visibility rules

`get_active_project_events` returns rows where `archived_at IS NULL AND status = 'active' AND published_at IS NOT NULL`, filtered by audience match (or `project_wide`). Deterministic order: `is_featured DESC, start_at ASC NULLS LAST, priority DESC, id`.

## Detail contract

`get_active_event_detail` returns event mobile-safe fields, sessions, agenda, speakers, attachments, `site_tour_details` (only when `event_type = 'site_tour'`), derived state, capacity stats, server-computed eligibility, and only the caller's `my_registrations`. Other-user registrations are never returned.

## Registration listing

`get_my_event_registrations` filters by `auth.uid()`; there is no code path that returns another user's registrations. `can_cancel` is server-computed from status and event window.

## Client integration

`src/services/events.service.ts` exposes typed wrappers: `getActiveProjectEvents`, `getActiveEventDetail`, `checkEventEligibility`, `registerForEvent`, `cancelMyEventRegistration`, `getMyEventRegistrations`, plus `eventToCalendarData` helper.