-- Phase 6C.1 — RLS regression assertions for Event Engine.
-- Runs as a single transaction; ROLLBACK at the end so nothing persists.
-- IMPORTANT: this file assumes execution as a session with a role that does
-- NOT have BYPASSRLS (i.e. NOT `postgres` / `service_role`). When run through
-- psql as the owner it will report "expected RLS reject did not fire" — use
-- `SET ROLE authenticated` before running, or execute via the Supabase SQL
-- editor as an anon/authenticated session.

BEGIN;

SET LOCAL client_min_messages = warning;

-- ---------------- Guarded helper: fail loudly if an INSERT unexpectedly succeeds ----------------
CREATE OR REPLACE FUNCTION pg_temp.expect_rls_reject(p_sql text, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'RLS_REGRESSION_FAILED: % (statement did not raise)', p_label;
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR raise_exception THEN
      -- expected: RLS or CHECK denied the write
      NULL;
    WHEN sqlstate '42501' THEN NULL;
  END;
END $$;

-- Direct writes on events/event_sessions/junctions must be denied
SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.events(project_id, name, slug, event_type, timezone)
    VALUES (gen_random_uuid(), 'x', 'x-rls', 'sales_event', 'Asia/Ho_Chi_Minh')$$,
  'events direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$UPDATE public.events SET name = name WHERE false$$,
  'events direct UPDATE denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.event_sessions(event_id, title, start_at, end_at)
    VALUES (gen_random_uuid(), 't', now(), now() + interval '1 hour')$$,
  'event_sessions direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.event_product_types(event_id, product_type_id)
    VALUES (gen_random_uuid(), gen_random_uuid())$$,
  'event_product_types direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.event_products(event_id, product_id)
    VALUES (gen_random_uuid(), gen_random_uuid())$$,
  'event_products direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.event_sales_policies(event_id, policy_id)
    VALUES (gen_random_uuid(), gen_random_uuid())$$,
  'event_sales_policies direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.event_vouchers(event_id, voucher_id)
    VALUES (gen_random_uuid(), gen_random_uuid())$$,
  'event_vouchers direct INSERT denied');

-- registrations.registration_type IN (event,site_tour,voucher) must be denied for direct INSERT
SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.registrations(registration_type, project_id, created_by)
    VALUES ('event', gen_random_uuid(), auth.uid())$$,
  'registrations event direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.registrations(registration_type, project_id, created_by)
    VALUES ('site_tour', gen_random_uuid(), auth.uid())$$,
  'registrations site_tour direct INSERT denied');

SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.registrations(registration_type, project_id, created_by)
    VALUES ('voucher', gen_random_uuid(), auth.uid())$$,
  'registrations voucher direct INSERT denied');

-- audit_logs client insert must be denied
SELECT pg_temp.expect_rls_reject(
  $$INSERT INTO public.audit_logs(user_id, action, entity_type)
    VALUES (auth.uid(), 'x', 'x')$$,
  'audit_logs client INSERT denied');

-- Internal helpers must not be executable by anon/authenticated
SELECT pg_temp.expect_rls_reject(
  $$SELECT public.get_or_create_registration_lead(auth.uid(), NULL, NULL)$$,
  'get_or_create_registration_lead not executable to caller');

SELECT pg_temp.expect_rls_reject(
  $$SELECT public._event_registration_count(gen_random_uuid())$$,
  '_event_registration_count not executable to caller');

SELECT '[phase_6c_events_rls] all assertions passed' AS result;

ROLLBACK;