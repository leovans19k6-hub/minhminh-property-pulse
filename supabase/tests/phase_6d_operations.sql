-- Phase 6D — Operations Engine functional tests (executable subset).
-- Runs against production schema. All fixtures created inside a transaction and rolled back.
-- Assertions use `ASSERT` on plpgsql DO blocks.

BEGIN;

DO $$ BEGIN
  -- 1) Domain mapping
  ASSERT public.get_registration_domain('event') = 'EVENT', 'event → EVENT';
  ASSERT public.get_registration_domain('site_tour') = 'EVENT', 'site_tour → EVENT';
  ASSERT public.get_registration_domain('voucher') = 'VOUCHER', 'voucher → VOUCHER';
  ASSERT public.get_registration_domain('consultation') = 'CONSULTATION', 'consultation → CONSULTATION';
  ASSERT public.get_registration_domain('anything') = 'OTHER', 'unknown → OTHER';

  -- 2) Lead transitions
  ASSERT public.can_transition_lead_status('new','contacted'), 'new→contacted';
  ASSERT public.can_transition_lead_status('new','qualified'), 'new→qualified';
  ASSERT public.can_transition_lead_status('contacted','nurturing'), 'contacted→nurturing';
  ASSERT public.can_transition_lead_status('qualified','converted'), 'qualified→converted';
  ASSERT public.can_transition_lead_status('nurturing','converted'), 'nurturing→converted';
  ASSERT public.can_transition_lead_status('lost','nurturing'), 'lost reopen → nurturing';
  ASSERT NOT public.can_transition_lead_status('converted','contacted'), 'converted terminal';
  ASSERT NOT public.can_transition_lead_status('new','converted'), 'new→converted forbidden (direct)';
  ASSERT NOT public.can_transition_lead_status('lost','contacted'), 'lost→contacted forbidden';

  -- 3) Registration transitions
  ASSERT public.can_transition_registration_status('new','in_progress'), 'reg new→in_progress';
  ASSERT public.can_transition_registration_status('new','confirmed'), 'reg new→confirmed';
  ASSERT public.can_transition_registration_status('new','rejected'), 'reg new→rejected';
  ASSERT public.can_transition_registration_status('in_progress','confirmed'), 'reg in_progress→confirmed';
  ASSERT public.can_transition_registration_status('confirmed','completed'), 'reg confirmed→completed';
  ASSERT public.can_transition_registration_status('confirmed','cancelled'), 'reg confirmed→cancelled';
  ASSERT public.can_transition_registration_status('confirmed','no_show'), 'reg confirmed→no_show';
  ASSERT NOT public.can_transition_registration_status('new','completed'), 'reg new→completed forbidden';
  ASSERT NOT public.can_transition_registration_status('completed','new'), 'reg completed terminal';
  ASSERT NOT public.can_transition_registration_status('cancelled','new'), 'reg cancelled terminal';
  ASSERT NOT public.can_transition_registration_status('rejected','new'), 'reg rejected terminal';
END $$;

-- 4) Table shape guards
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_activities'), 'crm_activities exists';
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_tasks'), 'crm_tasks exists';
  ASSERT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='registration_reviews'), 'registration_reviews exists';

  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.crm_activities'::regclass), 'crm_activities RLS ON';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.crm_tasks'::regclass), 'crm_tasks RLS ON';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid='public.registration_reviews'::regclass), 'registration_reviews RLS ON';

  -- No INSERT/UPDATE/DELETE policies on crm_activities → default deny
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_activities' AND cmd IN ('INSERT','UPDATE','DELETE')), 'crm_activities no write policy';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crm_tasks' AND cmd IN ('INSERT','UPDATE','DELETE')), 'crm_tasks no write policy';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='registration_reviews' AND cmd IN ('INSERT','UPDATE','DELETE')), 'registration_reviews no write policy';
END $$;

-- 5) Lead CHECK constraint expanded
DO $$ BEGIN
  ASSERT (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='leads_status_check') ILIKE '%nurturing%', 'nurturing in leads status CHECK';
END $$;

-- 6) Registration status expanded to include rejected
DO $$ BEGIN
  ASSERT (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname='registrations_status_check') ILIKE '%rejected%', 'rejected in registrations status CHECK';
END $$;

-- 7) Function grants — user-facing RPCs granted to authenticated
DO $$ DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'update_lead_profile','assign_lead','set_lead_priority','transition_lead_status',
    'convert_lead','mark_lead_lost','reopen_lead',
    'assign_registration','transition_registration_status','review_registration',
    'create_crm_activity','get_lead_timeline','get_registration_timeline',
    'create_crm_task','update_crm_task','assign_crm_task','start_crm_task','complete_crm_task','cancel_crm_task',
    'search_leads','get_lead_admin_detail','search_registrations','get_registration_admin_detail',
    'get_operations_dashboard','get_my_operations_work','search_crm_tasks',
    'bulk_assign_leads','bulk_assign_registrations'
  ] LOOP
    ASSERT EXISTS (
      SELECT 1 FROM information_schema.role_routine_grants g
      WHERE g.routine_schema='public' AND g.routine_name=r AND g.grantee='authenticated'
    ), format('%s granted to authenticated', r);
  END LOOP;
END $$;

-- 8) Internal helpers revoked from authenticated
DO $$ DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['_log_crm_activity','_task_access'] LOOP
    ASSERT NOT EXISTS (
      SELECT 1 FROM information_schema.role_routine_grants g
      WHERE g.routine_schema='public' AND g.routine_name=r AND g.grantee='authenticated'
    ), format('%s NOT granted to authenticated', r);
  END LOOP;
END $$;

ROLLBACK;