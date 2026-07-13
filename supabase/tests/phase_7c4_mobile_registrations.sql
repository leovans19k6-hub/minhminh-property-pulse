-- Phase 7C.4 — Mobile My Registrations: static smoke tests.
-- Verifies function existence, signature and privilege matrix.

-- 1. Both RPCs exist with expected identity arguments.
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname IN ('search_my_mobile_registrations','get_my_mobile_registration_detail')
ORDER BY proname;

-- 2. Both are SECURITY DEFINER + search_path = public.
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN ('search_my_mobile_registrations','get_my_mobile_registration_detail');

-- 3. Privilege matrix: authenticated + service_role only; anon must have NO EXECUTE.
SELECT
  p.proname,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_can,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can,
  has_function_privilege('service_role',  p.oid, 'EXECUTE') AS srv_can
FROM pg_proc p
WHERE p.proname IN ('search_my_mobile_registrations','get_my_mobile_registration_detail');

-- Expected:
--   anon_can = false, auth_can = true, srv_can = true for both.