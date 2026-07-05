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
