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
