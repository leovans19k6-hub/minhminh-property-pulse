# Operations RLS Test Harness (Phase 6D.1)

Multi-JWT tests emulate Supabase auth inside plain `psql` sessions using PostgREST-compatible GUCs:

```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',  '<user-uuid>', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
```

`auth.uid()` reads `request.jwt.claim.sub`. Reset with `RESET ROLE; SELECT set_config('request.jwt.claim.sub','',true);`.

Anon assertions use `SET LOCAL ROLE anon`. Service role assertions use `SET LOCAL ROLE service_role`.

Every assertion runs inside `BEGIN ... ROLLBACK`. The transaction owner may bypass RLS: always `SET ROLE` before asserting policy behavior; never assert against the connection role.

Deterministic fixtures live at the top of `supabase/tests/phase_6d_operations_rls.sql`. Status: NOT EXECUTED — requires a two-project + multi-role fixture seed the environment does not yet ship.

## Phase 6D.2 execution attempt

**Status: BLOCKED.** Attempted to promote the RLS / bulk / functional templates into executable tests using deterministic fixtures. Blocked by two environmental gaps that must be resolved before green results can be reported:

1. **Session-mode direct connection required.** The sandbox `psql` connects through PgBouncer in transaction pooling mode as the `authenticator` role. `SET LOCAL ROLE authenticated / anon / service_role` inside `BEGIN … ROLLBACK` is not reliable across pooled statements; assertions can leak the connection role instead of the intended `SET ROLE`.
2. **Privileged fixture seeder required.** Deterministic multi-role fixtures need inserts into `auth.users` and controlled `profiles`, `user_roles`, `project_members`, `leads`, `registrations`, `vouchers`, `events`, `crm_tasks`. Neither service-role credentials nor a direct Postgres superuser session are available in the sandbox.

Consequence: `phase_6d_operations.sql`, `phase_6d_operations_bulk.sql`, `phase_6d_operations_rls.sql` remain **NOT EXECUTED**. The Phase 6D.2 turn deliberately did not create a runner script or a placeholder fixture file whose sole outcome would be to fail on every invocation — that would add verification debt without adding coverage.

**Unblock path:**

- Provide a session-mode `DATABASE_URL` (port 5432, not 6543) authenticated as a role able to `SET ROLE` freely.
- Provide a privileged seeder (service role or migration-owner) that can insert deterministic `auth.users`.
- Wrap all assertions in `BEGIN … ROLLBACK`; verify `current_user`, `auth.uid()`, and `current_setting('request.jwt.claim.sub', true)` at the top of every role-scoped block.
- Only then wire a `scripts/run-phase-6d-verification.sh` runner and update the release gate rows to PASS / FAIL based on real output.
