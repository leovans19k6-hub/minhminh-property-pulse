# Operations Security (Phase 6D)

- Reads via table RLS:
  - `crm_activities` / `crm_tasks` / `registration_reviews` — SELECT policy checks `is_active_user()` + project-manager / assignee / creator.
  - No `INSERT/UPDATE/DELETE` policies → all writes deny by default. Only SECURITY DEFINER RPCs mutate.
- All Phase 6D user-facing RPCs are `SECURITY DEFINER SET search_path = public`, revoked from `anon`, granted to `authenticated` + `service_role`.
- Internal helpers (`_log_crm_activity`, `_task_access`) revoked from `authenticated`.
- Audit: every mutation calls `write_audit_log` with `changed_fields` / `old_status` / `new_status` / `reason` / `decision` / `domain` / bulk `count`.
- Existing linter warnings (0011 / 0028 / 0029) acknowledged per `docs/RPC_PRIVILEGE_MATRIX.md`.