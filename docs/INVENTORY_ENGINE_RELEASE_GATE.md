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

## Phase 7A addition (Mobile Sales App — Projects / Project Detail / Inventory read foundation)

Phase 7A cuts Mobile Home / Projects / Project Detail / Inventory list off mock data and onto real RPCs (`get_mobile_projects`, `get_mobile_project_detail`, `search_mobile_inventory`, `get_mobile_inventory_filters`, `can_access_mobile_project`). Additive migrations only.

| Gate | Status |
| --- | --- |
| Mobile project access helper (`can_access_mobile_project`) authorization | PASS (static) — verified via `has_function_privilege` on 2026-07-05 (anon deny / authenticated allow) |
| Mobile projects RPC privilege grant | PASS (static) — same check |
| Mobile inventory RPC privilege grant | PASS (static) — same check |
| Mobile inventory realtime publication (`products`, `product_price_options`, `product_custom_values`) | PASS (static) — verified via `pg_publication_tables` |
| Mobile UI runtime regression (Home / Projects / Project Detail / Inventory) | NOT EXECUTED |
| 360 / 390 / 430 px overflow regression | NOT EXECUTED |
| Authenticated preview regression | NOT EXECUTED |

## Phase 7B addition (Mobile Product Detail + Favorites)

Phase 7B ships `get_mobile_product_detail`, `add_mobile_favorite`, `remove_mobile_favorite`, `get_mobile_favorites`, and `_resolve_mobile_primary_contact`. Product Detail + Favorites are Supabase-backed.

| Gate | Status |
| --- | --- |
| Mobile Product authorization (auth + active + accessible + non-archived) | PASS (static) — `get_mobile_product_detail` source verified |
| Product Detail contract shape at service boundary (runtime type guard) | PASS (implementation) — runtime regression NOT EXECUTED |
| Nested Policy applicability scope (`get_active_project_policies`) | PASS (static, code review) — runtime regression NOT EXECUTED |
| Nested Voucher preview scope (`get_active_project_vouchers`) | PASS (static, code review) — runtime regression NOT EXECUTED |
| Nested Event preview scope (`get_active_project_events`) | PASS (static, code review) — runtime regression NOT EXECUTED |
| Price history visibility (super_admin/admin/director or project manager) | PASS (static) — RPC source verified |
| Status history visibility (same gate) | PASS (static) — RPC source verified |
| Primary Contact privacy (no email/employee_code/role leakage) | PASS (static) — `_resolve_mobile_primary_contact` returns whitelisted columns only |
| `_resolve_mobile_primary_contact` privilege (internal only) | PASS — verified deny for anon/authenticated on 2026-07-05 |
| Favorites own-user isolation | PASS (static) — RPC filters by `auth.uid()` |
| Favorites inaccessible-product rejection on add | PASS (static) — `can_access_mobile_product` guard |
| Favorites idempotent add (`ON CONFLICT DO NOTHING`) | PASS (static) — source verified |
| Favorites idempotent remove (unconditional delete on own row) | PASS (static) — source verified |
| Favorites deterministic pagination (offset + secondary sort) | PASS (static) — RPC source verified; runtime regression NOT EXECUTED |
| Mobile Product Detail runtime regression | NOT EXECUTED |
| Mobile Favorites runtime regression | NOT EXECUTED |
| Project Detail CTA regression | NOT EXECUTED |

## Phase 7B.1 addition (Hardening pass)

Phase 7B.1 is an additive hardening pass: narrows Product Detail realtime to product-scoped tables only (drops project-scoped `sales_policies` / `vouchers` / `events` subscriptions), adds `product_media` to `supabase_realtime`, removes every `as never` cast at mobile service boundaries by consuming the regenerated `Database` types, and inserts a runtime shape guard for the `get_mobile_product_detail` `jsonb` payload.

| Gate | Status |
| --- | --- |
| `product_media` in `supabase_realtime` publication | PASS — verified via `pg_publication_tables` post-migration |
| Product Detail realtime narrowed to product-scoped tables (products / prices / custom_values / media) | PASS (implementation) — runtime regression NOT EXECUTED |
| Product Detail realtime channel cleanup on unmount / product change | PASS (implementation) — effect depends on `currentProductId`; `removeChannel` + `clearTimeout` in cleanup |
| Generated RPC type safety at mobile service boundary (no `as never`) | PASS — `rg "as never" src/services/mobile/` returns 0 hits |
| Runtime shape guard on `get_mobile_product_detail` payload | PASS (implementation) — throws friendly `ServiceError` on malformed / null payload |
| Static privilege matrix for Phase 7A + 7B mobile RPCs | PASS — `has_function_privilege` matrix executed 2026-07-05 |
| Full mobile end-to-end regression (auth + Home + Projects + Detail + Inventory + Product Detail + Favorites) | NOT EXECUTED |

Phase 7B.1 does **not** promote Mobile Sales App to production-verified. Static contract checks (privileges, publication, RPC source, generated types) pass; end-to-end runtime regression remains outstanding and is required before any promotion.

## Phase 7C.3 addition (Mobile Events & Site Tours cutover)

Phase 7C.3 is an additive mobile cutover on top of the canonical Event Engine (Phase 6C / 6C.1). No canonical event RPC was modified; the mobile layer only adds `search_mobile_events`, `get_mobile_event_detail`, and extends `get_mobile_project_detail` with an `events_preview` array.

| Gate | Status |
| --- | --- |
| `search_mobile_events` / `get_mobile_event_detail` grants (authenticated + service_role only, PUBLIC/anon revoked) | PASS — verified via `pg_proc.proacl` on 2026-07-08 |
| `search_mobile_events` set-returning helper bug (`ANY(public.accessible_mobile_project_ids())`) | FIXED — replaced with `IN (SELECT …)` in follow-up migration; re-executed against DB returns `[]` (no error) |
| Canonical event RPCs unchanged (`register_for_event`, `cancel_my_event_registration`, `check_event_eligibility`, `event_derived_state`, `_event_registration_count`) | PASS (static) — Phase 7C.3 migrations do not redefine them |
| `registrations` type constraint compatibility (`event` / `site_tour` require `event_id`) | PASS — verified against `registrations_type_targets` CHECK |
| Route tree includes `/events` and `/events/$eventId` | PASS — `src/routeTree.gen.ts` regenerated |
| TypeScript `tsgo --noEmit` | PASS |
| Runtime shape guard on `get_mobile_event_detail` payload | PASS (implementation) |
| End-to-end mobile Events regression (list + detail + register + cancel + site tour variant) | NOT EXECUTED |
| Runtime detail smoke test against a seeded published event | NOT EXECUTED — no published events in the current environment |

Phase 7C.3 does **not** promote Mobile Sales App to production-verified. Static contract checks pass and the one runtime bug found (`ANY` on set-returning helper) is fixed; end-to-end mobile Events regression remains outstanding.

## Phase 7C.4 addition (Mobile My Registrations)

Additive read-only mobile cutover: two new RPCs (`search_my_mobile_registrations`, `get_my_mobile_registration_detail`) plus `/registrations` list + `/registrations/$registrationId` detail. No canonical registration RPC was modified; cancellation dispatches to `cancel_my_voucher_registration` / `cancel_my_event_registration`.

| Check | Status |
| --- | --- |
| Both RPCs are `SECURITY DEFINER SET search_path = public` | PASS (static) |
| Privilege matrix (anon=NO, authenticated=YES, service_role=YES) | PASS (verified via `pg_proc` + `has_function_privilege`) |
| Scope strictly `created_by = auth.uid()` | PASS (static SQL) |
| Activity summary limited to `status_change / system / registration_review` and safe fields only | PASS (static SQL) |
| Cancellation goes through canonical voucher/event RPCs; consultation/other cannot be cancelled from mobile | PASS (implementation) |
| Canonical voucher/event/operations RPCs unchanged | PASS (static — no redefinitions in the 7C.4 migration) |
| Typecheck (`tsgo --noEmit`) | PASS |
| Runtime shape guard on detail payload | PASS (implementation) |
| End-to-end mobile regression (list + detail + cancel per domain) | NOT EXECUTED — no seeded user-owned registrations in the current environment |

Phase 7C.4 does not promote the Mobile Sales App to production-verified. Static contract, privilege and typecheck are green; end-to-end regression remains outstanding.

## Phase 7C.5 addition (Mobile Notifications Cutover)

No new RPCs and no migrations. The `public.notifications` table already ships owner-scoped RLS (`notifications_read_own`, `notifications_update_own`, `notifications_insert_admin`) and standard `authenticated` CRUD grants. This phase hardens the mobile surface only.

| Check | Status |
| --- | --- |
| RLS enabled + read/update/insert policies present on `public.notifications` | PASS (verified via `pg_class` + `pg_policies`) |
| `authenticated` role has `SELECT` + `UPDATE` on `public.notifications` | PASS (verified via `information_schema.role_table_grants`) |
| Mobile client never invokes an `INSERT` path on `notifications` | PASS (grep of `src/services/notifications.service.ts`) |
| Deterministic ordering (`created_at DESC, id DESC`) + one-extra-row `hasMore` | PASS (implementation) |
| Server-side `unreadOnly` filter (`is('read_at', null)`) | PASS (implementation) |
| `action_url` restricted to allow-listed same-origin prefixes; external URLs rejected | PASS (`safeInternalHref`) |
| Raw `metadata` never surfaced to UI | PASS (grep) |
| Narrow cache invalidation after `markRead` / `markAllRead` | PASS (implementation) |
| Typecheck (`tsgo --noEmit`) | PASS |
| End-to-end mobile Notifications regression (list + unread filter + mark one + mark all + safe-nav) | NOT EXECUTED — no seeded notifications for a mobile user in the current environment |

Phase 7C.5 does not promote the Mobile Sales App to production-verified. Static contract, privilege and typecheck are green; end-to-end regression remains outstanding.

## Phase 7D addition (Runtime Regression & Hardening)

No new domains, migrations, or RPCs. This phase is a full sweep of the mobile
app to fix regressions and correctness issues found via static review, typecheck,
build, and console/dev-server log inspection.

| Check | Status |
| --- | --- |
| Typecheck (`tsgo --noEmit`) | PASS (0 errors) |
| Production build (`bun run build`) | PASS |
| Dev-server error/warn scan | CLEAN (only benign HMR `data-tsd-source` tagger deltas — dev-only Lovable inspector attribute) |
| Mock-import scan (`rg 'features/mock\|mock/data'`) | CLEAN (0 hits; `src/features/mock/` removed in 7C.6) |
| localStorage domain-state scan | CLEAN (only benign `ViewToggle` UI-preference key) |
| Auth subscribers cleanup (`onAuthStateChange`) | PASS (both `AuthProvider` and `reset-password` return `unsubscribe` in effect cleanup) |
| Duplicate `<meta>` tags in `__root.tsx` head | FIXED — removed duplicated `description` / `og:description` rows |
| BottomNav ↔ real route parity | PASS (5/5 routes present) |
| Route guards (public allow-list + `AuthGuard`) | PASS (public: `/login`, `/forgot-password`, `/reset-password`, `/unauthorized`) |
| Query-key duplication / stale legacy keys | PASS (no duplicates; non-mobile keys still consumed by admin/shared code) |
| Sensitive `metadata` surfaced to notifications UI | PASS (already stripped in 7C.5) |
| End-to-end mobile regression across all surfaces | NOT EXECUTED — no seeded mobile user data in the current environment |
| Responsive audit across 360 / 375 / 390 / 412 / 430 / 640 / 768 breakpoints | NOT EXECUTED — static review only; `MobileShell` uses fluid layout capped at `sm:max-w-[640px]` / `md:max-w-[720px]` |
| Realtime channel leak review | PASS (no additional subscribers beyond the two audited above) |

Phase 7D does not promote the Mobile Sales App to production-verified. Static
contract, typecheck, build, and dead-code sweeps are green; end-to-end runtime
regression on a seeded environment remains the outstanding gate.
