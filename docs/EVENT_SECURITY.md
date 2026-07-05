# Event Security (Phase 6C)

## RLS posture

- `events`: `events_read` (any active user), `events_deny_write` (all direct writes denied). All mutations go through trusted RPCs.
- `event_sessions`, `event_product_types`, `event_products`, `event_sales_policies`, `event_vouchers`: read via parent-event access, `_no_write` denies all direct writes.
- `registrations_insert` is tightened to `registration_type NOT IN ('voucher','event','site_tour')` — Event and Voucher registrations only reach the table through their dedicated RPCs.

## RPC surface

See `docs/RPC_PRIVILEGE_MATRIX.md`. All user-facing RPCs are `SECURITY DEFINER` with `SET search_path = public` and inline `auth.uid()` + `is_active_user()` + `is_project_manager()` checks. Internal helpers (`_apply_event_audience`, `_apply_event_sessions`, `_event_registration_count`, `event_derived_state`, and every `validate_*`) are `REVOKE`-ed from `PUBLIC`, `anon`, and `authenticated`.

## Audit

Every mutation writes an `audit_logs` row with `user_id = auth.uid()`, `action`, `entity_type`, `entity_id`, and a scoped `metadata` object (`project_id`, `event_type`, `changed_keys`, `session_count`, `reason`, `source_event_id`, `lead_id`). Client cannot forge audit — the `audit_logs` policy denies direct authenticated inserts.

## Cross-project isolation

`_apply_event_audience` verifies every product_type / product / policy / voucher id belongs to the event's project before insert; a mismatch raises `invalid_event_*` and rolls back the whole RPC. `check_event_eligibility` and `register_for_event` re-validate context product against the event's `project_id`.

## PII exposure

Mobile queries never return lead PII beyond the caller's own registrations. Admin detail returns aggregate registration counts but no phone/email columns from `leads`.