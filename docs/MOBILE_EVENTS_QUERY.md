# Mobile Events Query Contract (Phase 7C.3)

## `search_mobile_events(p_project_id, p_query, p_event_type, p_featured, p_derived_state, p_starts_from, p_starts_to, p_product_id, p_limit, p_offset)`

Returns a `jsonb` array (never `null`; empty → `[]`).

**Auth** — requires signed-in active user (`auth.uid()` + `is_active_user()`), otherwise raises `permission_denied`.

**Visibility filters**
- `archived_at IS NULL AND status = 'active' AND published_at IS NOT NULL`.
- `derived_state NOT IN ('archived','draft','paused','cancelled')`.
- If `p_project_id IS NULL`, `project_id IN (SELECT public.accessible_mobile_project_ids())`.
- If `p_project_id` provided, only that project.
- Optional filters: `event_type`, `is_featured`, `derived_state`, `start_at` window (`p_starts_from`/`p_starts_to`), free-text `p_query` on title/summary/location.
- Optional applicability filter by `p_product_id` (matches `project_wide`, `event_products`, or `event_product_types` via the product's type).

**Order** — `is_featured DESC, start_at ASC NULLS LAST, priority DESC, id ASC`. Pagination is `LIMIT` (1..100, default 30) + `OFFSET`.

**Row fields** — `id, project_id, project_name, project_code, title, slug, event_type, summary, start_at, end_at, timezone, location_type, location_name, address_text, meeting_url, thumbnail_url, is_featured, priority, derived_state, registration_start, registration_deadline, capacity, registration_count, remaining, is_unlimited, per_user_limit, user_registration_count`.

## `get_mobile_project_detail(p_project_id)` — additive extension

Response gains `events_preview: jsonb[]` (max 5 rows) using the same visibility rules as `search_mobile_events` scoped to the project. Existing fields are unchanged.

## Client wrappers

`src/services/mobile/events.service.ts`:
- `searchMobileEvents(args)` → `MobileEventListItem[]`.
- `getMobileEventDetail(eventId, ctx)` → `MobileEventDetail` (see `MOBILE_EVENTS_DETAIL.md`).
- `registerForMobileEvent(eventId, ctx)` → thin wrapper over `register_for_event`.
- `cancelMyMobileEventRegistration(registrationId)` → wrapper over `cancel_my_event_registration`.

All wrappers map DB errors to Vietnamese `ServiceError` messages consumed by the mobile UI.