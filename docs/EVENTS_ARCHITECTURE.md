# Events Architecture (Phase 6C)

## Domain model

`events` is the single table for the Event Engine. Site Tour is `event_type = 'site_tour'` — no separate `site_tours` table. Additional canonical types: `sales_event`, `training`, `opening`, `customer_event`, `other`. Legacy values `event` and `launch` are retained in the CHECK constraint to preserve existing data.

### Related tables

| Table | Purpose |
| --- | --- |
| `event_sessions` | Machine-queryable time blocks inside an event. |
| `event_product_types` / `event_products` / `event_sales_policies` / `event_vouchers` | Audience/applicability relations. |
| `registrations` (reused) | Event registrations use `registration_type = 'event'` (or `'site_tour'` when the event is a site tour), always via the `register_for_event` RPC. |
| `leads` (reused) | Reused or created by phone dedup on registration. |

### JSON columns

`agenda_json`, `speakers_json`, `attachments`, `site_tour_details`. Sessions live in a dedicated table because they are queried by time; agenda is presentation-only content.

## Lifecycle

Stored statuses: `draft`, `active`, `paused`, `cancelled`, `completed`, `archived` (`inactive` legacy). Derived states (`event_derived_state`): `draft`, `upcoming_registration`, `registration_open`, `upcoming`, `ongoing`, `full`, `registration_closed`, `completed`, `cancelled`, `paused`, `archived`. Derived state is computed on-demand from stored fields + registration count — no cron.

## Location model

`location_type` in `physical`, `online`, `hybrid`; validation enforced by `validate_event_location`. Coordinates are stored in `latitude`/`longitude` for external map deep-linking; no map SDK is integrated.

## Trusted mutation RPCs

All create/update/publish/pause/resume/cancel/complete/clone/archive/restore paths are SECURITY DEFINER RPCs. Direct client writes are denied by `events_deny_write` and the equivalent policy on every relation/junction table. See `docs/RPC_PRIVILEGE_MATRIX.md`.

## Registration & concurrency

`register_for_event` uses `pg_advisory_xact_lock(hashtextextended(event_id::text, 43))` (seed 43 avoids the Voucher lock's seed 42). Full flow: lock → re-fetch → re-check eligibility → re-count capacity → per-user limit → lead reuse/create → registration insert → cached-count update → audit. See `docs/EVENT_CAPACITY_CONCURRENCY.md`.

## Audience matching

Applicability is computed by `_apply_event_audience` and enforced by `check_event_eligibility`. Empty audience → `project_wide`; a single relation → its scope; more than one → `mixed`. Cross-project references are rejected.

## Mobile-ready queries

`get_active_project_events`, `get_active_event_detail`, `get_my_event_registrations`. Only published/active/non-archived/non-paused/non-cancelled events are visible; every row is scoped to the authenticated user and hides other-user registration data.