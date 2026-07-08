-- Phase 7C.3 — Mobile Events RPC smoke tests
-- Static contract checks. Runtime path checks require a signed-in JWT context;
-- the env-only checks below can be executed by `psql` against the project DB.

-- 1. Function existence and SECURITY DEFINER flag.
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('search_mobile_events','get_mobile_event_detail','get_mobile_project_detail')
ORDER BY proname;

-- 2. Grant matrix: anon must NOT have EXECUTE on the two new mobile event RPCs.
SELECT p.proname, r.rolname, a.privilege_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(p.proacl) a ON true
LEFT JOIN pg_roles r ON r.oid = a.grantee
WHERE n.nspname = 'public'
  AND p.proname IN ('search_mobile_events','get_mobile_event_detail')
ORDER BY p.proname, r.rolname NULLS FIRST;

-- 3. Unauthenticated call must raise `permission_denied`.
DO $$
BEGIN
  BEGIN
    PERFORM public.search_mobile_events(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,0);
    RAISE EXCEPTION 'search_mobile_events did not deny unauthenticated caller';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'permission_denied' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.get_mobile_event_detail('00000000-0000-0000-0000-000000000000'::uuid, NULL, NULL, NULL, NULL);
    RAISE EXCEPTION 'get_mobile_event_detail did not deny unauthenticated caller';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'permission_denied' THEN RAISE; END IF;
  END;
END $$;

-- 4. Signed-in call returns a jsonb ARRAY (empty is OK) — replace :uid with any
-- active user_id and run through a role capable of setting request.jwt.claims.
-- Example (service role / psql superuser):
--   SET LOCAL request.jwt.claims = '{"sub":"<uid>","role":"authenticated"}';
--   SELECT jsonb_typeof(public.search_mobile_events(NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,5,0));

-- 5. Canonical Phase 6C event RPCs still present and unchanged in signature.
SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('register_for_event','cancel_my_event_registration','check_event_eligibility','event_derived_state','_event_registration_count')
ORDER BY proname;