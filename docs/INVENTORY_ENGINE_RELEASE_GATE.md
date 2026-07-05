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

## Phase 6D addition (Operations Engine)

Phase 6D adds Leads CRM + Registration Operations + CRM Tasks + Activity Timeline + Review + Bulk Assignment + Operations Dashboard + My Work foundation. Additive migration only; existing modules remain in their prior verification state.

| Gate | Status |
| --- | --- |
| Phase 6C.1 gates (functional / RLS / concurrency / UI / voucher regression) | NOT EXECUTED |
| Phase 6D functional SQL tests (`supabase/tests/phase_6d_operations.sql`) | NOT EXECUTED |
| Phase 6D RLS regression (`supabase/tests/phase_6d_operations_rls.sql`) | NOT EXECUTED |
| Phase 6D bulk / atomicity tests (`supabase/tests/phase_6d_operations_bulk.sql`) | NOT EXECUTED |
| Phase 6D UI regression (Operations / Leads / Registrations / Tasks) | NOT EXECUTED |
| Voucher & Event registration regression after Operations layer | NOT EXECUTED |

Phase 6D implementation does **not** make any prior module production-verified. The additive migration is safe (new tables, expanded CHECK sets, additive columns, no destructive change to existing RPCs). All gates above must run green before flipping the release status.

## Phase 6D.1 addition (Operations verification + hardening)

Phase 6D.1 is an additive hardening pass: `search_assignable_users` / `search_bulk_assignable_users` RPCs, canonical `validate_operations_registration_transition` gate on `transition_registration_status` + `review_registration`, and the standardised `{requested_count, changed_count, unchanged_count, affected_ids}` contract for bulk assignment RPCs. No schema breakage.

| Gate | Status |
| --- | --- |
| Assignment Authorization Tests (`supabase/tests/phase_6d_operations.sql`, extended templates) | NOT EXECUTED |
| Registration Domain Transition Tests (voucher/event cancel + complete rejected; accept re-validated) | NOT EXECUTED |
| Bulk Lead Assignment Tests (`supabase/tests/phase_6d_operations_bulk.sql`) | NOT EXECUTED |
| Bulk Registration Assignment Tests (`supabase/tests/phase_6d_operations_bulk.sql`) | NOT EXECUTED |
| Operations Multi-JWT RLS Tests (`supabase/tests/phase_6d_operations_rls.sql`) | NOT EXECUTED |
| Legacy Voucher Registration Regression | NOT EXECUTED |
| Legacy Voucher Cancellation Regression | NOT EXECUTED |
| Legacy Event Registration Regression | NOT EXECUTED |
| Legacy Event Cancellation Regression | NOT EXECUTED |
| Operations UI Regression (dashboard / leads / registrations / tasks / detail dialogs) | NOT EXECUTED |
| Assignable User Picker UI (single + bulk multi-project, debounce/loading/empty/error) | NOT EXECUTED |

Phase 6D.1 does **not** promote any module to production-verified. All gates above must run green before flipping any module's release status.

## Phase 6D.2 addition (Server-authoritative capabilities + verification attempt)

Phase 6D.2 introduces `get_operations_registration_capabilities(uuid, uuid)` (SECURITY DEFINER, `authenticated`/`service_role` only) and cuts `get_registration_admin_detail` over to that resolver. The Admin Registration Detail UI now renders Cancel / Complete / Accept / Reject / Request-More-Info actions strictly from server-returned `capabilities.allowed_transitions` and `capabilities.allowed_review_decisions`. Restriction messages are server-authored (`domain_restrictions[]`). No client-side domain policy remains on that page.

| Gate | Status | Notes |
| --- | --- | --- |
| `get_operations_registration_capabilities` created + granted (auth, deny anon) | PASS | Verified via `has_function_privilege` on 2026-07-05. |
| `get_registration_admin_detail` cutover embeds `capabilities` | PASS | Verified via `pg_get_functiondef` on 2026-07-05. |
| Admin Registration Detail UI consumes server capabilities (no client domain inference) | PASS (implementation) — UI runtime regression NOT EXECUTED | Removed client-side `filter((s) => cancelled/completed)` and reviewability inference. |
| Deterministic Operations fixture (`supabase/tests/fixtures/phase_6d_fixture.sql`) | BLOCKED | Requires a service-role fixture harness with controlled `auth.users` seeding + `SET LOCAL ROLE` swapping. Sandbox `psql` connects via PgBouncer transaction-pooled `authenticator` role and cannot `SET LOCAL ROLE service_role` / `authenticated` mid-transaction reliably; JWT GUC injection was not validated end-to-end. |
| Phase 6D functional executable SQL (`phase_6d_operations.sql`, deterministic fixtures) | NOT EXECUTED | Blocked by fixture harness above. Template retained. |
| Phase 6D bulk executable SQL (`phase_6d_operations_bulk.sql`) | NOT EXECUTED | Blocked by fixture harness above. |
| Phase 6D multi-JWT RLS executable SQL (`phase_6d_operations_rls.sql`) | NOT EXECUTED | Blocked by fixture harness above. |
| Legacy Voucher / Event registration regression under Operations layer | NOT EXECUTED | Same blocker. |
| RPC privilege matrix executable checks | PARTIAL | `get_operations_registration_capabilities` + core Operations RPCs spot-verified via `has_function_privilege` on 2026-07-05; full matrix runner NOT EXECUTED. |
| Test runner (`scripts/run-phase-6d-verification.sh`) | NOT CREATED | Deferred until fixture harness lands — creating a runner that always errors adds no value. |
| Operations UI runtime regression | NOT EXECUTED | Requires seeded registrations of every domain + signed-in admin. |

**Explicit blocker for executable multi-JWT tests:** the current sandbox database access is a PgBouncer transaction-pooled connection as `authenticator`. Reliable RLS assertions require a direct session-mode connection able to `SET LOCAL ROLE authenticated / anon / service_role` inside `BEGIN … ROLLBACK`, plus a privileged fixture seeder that can insert into `auth.users`. Neither is available in the current environment.

Phase 6D.2 does **not** promote any module to production-verified. It closes the "client-side domain inference on Registration Detail" gap and adds a canonical server capability contract for future callers.
