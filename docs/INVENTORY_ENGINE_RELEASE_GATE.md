# Inventory Engine — Release Gate (as of Phase 6A start)

**Status: NOT YET PRODUCTION-VERIFIED.**

| Gate | Status |
| --- | --- |
| SQL smoke tests (`supabase/tests/phase_5e_inventory_engine.sql`) | NOT EXECUTED |
| UI regression (manual walk-through per `docs/PHASE_5D_SMOKE_TESTS.md`) | NOT EXECUTED |
| Realtime debounce | OPEN — per-callsite 300 ms debounce documented, central `useDebouncedInvalidation` hook is BACKLOG |
| Template explicit conflict strategy | BACKLOG — `apply_inventory_template` overwrite is coarse (`p_overwrite boolean`); no per-field diff/preview |
| Import dry-run | BACKLOG — `commit_inventory_import` is ALL_OR_NOTHING but no server-side dry-run RPC yet |
| Product Admin Detail RPC vs page | wired, but shape may drift; needs contract test |
| Field data-type / options immutability once values exist | ENFORCED at DB (guard triggers), UI hints partial |

**Do not mark Inventory Engine "production-ready" until the SQL and UI gates above are executed and green.**

Phase 6A does not block on this gate but does not close it either. Sales Policies module is additive.

## Phase 6B addition (Voucher Management)

- Phase 6A SQL tests (`supabase/tests/phase_6a_sales_policies.sql`) — **NOT EXECUTED**.
- Phase 6A UI regression — **NOT EXECUTED**.
- Phase 6B SQL tests (`supabase/tests/phase_6b_vouchers.sql`) — **NOT EXECUTED**.
- Phase 6B UI regression — **NOT EXECUTED**.

Phase 6B is additive; it does **not** make Inventory Engine or Sales Policies production-verified. Voucher Management ships behind the same gate: all listed SQL/UI tests must be executed and green before marking any of Inventory Engine, Sales Policies, or Voucher Management "production-ready".

## Phase 6C addition (Event Management Engine)

- Phase 6B SQL tests (`supabase/tests/phase_6b_vouchers.sql`) — **NOT EXECUTED**.
- Phase 6B UI regression — **NOT EXECUTED**.
- Phase 6B Voucher business-flow verification — **NOT EXECUTED**.
- Phase 6C SQL tests (`supabase/tests/phase_6c_events.sql`) — **NOT EXECUTED**.
- Phase 6C UI regression — **NOT EXECUTED**.
- Phase 6C Event registration concurrency verification — **NOT EXECUTED**.

Phase 6C implementation does **not** make Inventory Engine, Sales Policies, or Voucher Management production-verified. Event Management ships behind the same gate: every SQL and UI check above must be executed and green before any of the modules can be marked "production-ready".

## Phase 6C.1 addition (Event verification + registration hardening)

- IANA timezone validation trigger (`validate_event_timezone`) — INSTALLED via migration.
- Shared trusted lead helper (`get_or_create_registration_lead`) — INSTALLED; used by `register_for_event` and `register_for_voucher`. Concurrency-safe via `pg_advisory_xact_lock(hashtextextended(normalized_phone, 91))`; deterministic canonical selection `ORDER BY created_at ASC, id ASC`.
- Canonical predicate `is_event_registration_type(text)` — INSTALLED. Used by `register_for_event` and expected to be used by Phase 6D admin queries. TS mirror: `src/lib/registrationDomain.ts` (`isEventRegistrationType`, `CAPACITY_COUNTING_STATUSES`, `CANCELLABLE_STATUSES`, `getCanonicalRegistrationDomain`).

Gate rows:

| Gate | Status |
| --- | --- |
| Phase 6C.1 SQL functional tests (`supabase/tests/phase_6c_events.sql`, executable transactional subset) | NOT EXECUTED |
| Phase 6C.1 RLS regression (`supabase/tests/phase_6c_events_rls.sql`, requires `authenticated` session) | NOT EXECUTED |
| Phase 6C.1 concurrency scenarios (`supabase/tests/phase_6c_events_concurrency.sql`, requires two parallel sessions) | NOT EXECUTED |
| Phase 6C.1 UI regression (Events / Vouchers / Policies / Products tabs, auth flow) | NOT EXECUTED |
| Voucher regression after shared lead helper refactor | NOT EXECUTED |

Phase 6C.1 does **not** promote any module to production-verified. The additive migration is safe (no schema change, no data migration, RPC signatures unchanged), but all gates above must run green before flipping the release status.
