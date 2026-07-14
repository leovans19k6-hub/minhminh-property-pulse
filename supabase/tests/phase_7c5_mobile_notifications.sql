-- Phase 7C.5 static contract checks for mobile notifications.
-- Runs read-only against the current schema; fails loudly if RLS/grants
-- drift away from the documented contract.

DO $$
DECLARE
  cnt int;
BEGIN
  -- RLS enabled
  SELECT count(*) INTO cnt FROM pg_class
   WHERE relname = 'notifications'
     AND relnamespace = 'public'::regnamespace
     AND relrowsecurity = true;
  IF cnt <> 1 THEN RAISE EXCEPTION 'RLS not enabled on public.notifications'; END IF;

  -- Owner-scoped read policy
  SELECT count(*) INTO cnt FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'notifications'
     AND policyname = 'notifications_read_own'
     AND cmd = 'SELECT';
  IF cnt <> 1 THEN RAISE EXCEPTION 'Missing notifications_read_own SELECT policy'; END IF;

  -- Owner-scoped update policy
  SELECT count(*) INTO cnt FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'notifications'
     AND policyname = 'notifications_update_own'
     AND cmd = 'UPDATE';
  IF cnt <> 1 THEN RAISE EXCEPTION 'Missing notifications_update_own UPDATE policy'; END IF;

  -- Admin-only insert policy exists (mobile clients must not be able to insert)
  SELECT count(*) INTO cnt FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename  = 'notifications'
     AND policyname = 'notifications_insert_admin'
     AND cmd = 'INSERT';
  IF cnt <> 1 THEN RAISE EXCEPTION 'Missing notifications_insert_admin INSERT policy'; END IF;

  -- Confirm authenticated has SELECT + UPDATE (needed by mobile);
  SELECT count(*) INTO cnt FROM information_schema.role_table_grants
   WHERE table_schema='public' AND table_name='notifications'
     AND grantee='authenticated' AND privilege_type IN ('SELECT','UPDATE');
  IF cnt < 2 THEN
    RAISE EXCEPTION 'authenticated role missing SELECT/UPDATE on public.notifications';
  END IF;

  RAISE NOTICE 'phase_7c5_mobile_notifications: OK';
END
$$;