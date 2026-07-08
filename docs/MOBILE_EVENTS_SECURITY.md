# Mobile Events Security (Phase 7C.3)

## Function privileges

All Phase 7C.3 RPCs are `SECURITY DEFINER SET search_path = public`.

| Function | anon | authenticated | service_role |
| --- | --- | --- | --- |
| `search_mobile_events` | REVOKED | EXECUTE | EXECUTE |
| `get_mobile_event_detail` | REVOKED | EXECUTE | EXECUTE |
| `get_mobile_project_detail` (extended) | REVOKED | EXECUTE | EXECUTE |

Verified against `pg_proc.proacl` on 2026-07-08.

## Authorization inside RPCs

Both new RPCs inline `auth.uid()` + `is_active_user()` and raise `permission_denied` otherwise. Unauthenticated `psql` calls confirmed the raise.

## Visibility & data scoping

- Cross-project search is bounded by `public.accessible_mobile_project_ids()` (fixed in this phase to use `IN (SELECT …)` rather than `= ANY(...)` on a set-returning function, which raised at runtime).
- Only rows with `archived_at IS NULL`, `status = 'active'`, `published_at IS NOT NULL`, and `derived_state NOT IN ('archived','draft','paused','cancelled')` are returned.
- `get_mobile_event_detail` restricts `my_registration_state` to `auth.uid()`; no other user's registrations are ever returned.

## Writes

No new write RPC was introduced. Registration and cancellation still route through canonical `register_for_event` / `cancel_my_event_registration` (Phase 6C), which serialize concurrent callers via `pg_advisory_xact_lock(seed=43)` and validate audience/capacity server-side. Direct writes to `events*` tables remain denied by RLS.

## Linter warnings

Linter rules 0028/0029 flag Phase 7C.3 mobile RPCs as "SECURITY DEFINER + callable by authenticated". This is the same acknowledged pattern used across mobile RPCs (see `RPC_PRIVILEGE_MATRIX.md`); no anon exposure is added.