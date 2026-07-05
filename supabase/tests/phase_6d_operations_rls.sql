-- Phase 6D.1 — Operations Engine RLS regression (multi-JWT).
-- Requires two projects, ≥ 3 users (Manager A / Salesperson A / Salesperson B / Project-B user / inactive).
-- Status: NOT EXECUTED. Templates below use PostgREST-compatible GUCs; wrap each
-- assertion inside BEGIN ... ROLLBACK and always SET LOCAL ROLE before asserting.

-- Fixture placeholders (bind at runtime):
--   :proj_a, :proj_b
--   :mgr_a         -- project manager of :proj_a
--   :sp_a1         -- salesperson in :proj_a, assigned to :lead_a1
--   :sp_a2         -- salesperson in :proj_a, unrelated to :lead_a1
--   :usr_b         -- member of :proj_b only
--   :inactive      -- profiles.status='inactive'
--   :lead_a1       -- lead in :proj_a assigned to :sp_a1
--   :reg_a1        -- registration in :proj_a assigned to :sp_a1
--   :task_a1       -- task on :lead_a1 assigned to :sp_a1

-- =====================================================================
-- Manager A can read project A operations
-- =====================================================================
BEGIN;
  SELECT set_config('request.jwt.claim.sub',  :'mgr_a', true);
  SELECT set_config('request.jwt.claim.role', 'authenticated', true);
  SET LOCAL ROLE authenticated;
  -- Expect: rows visible
  -- SELECT count(*) > 0 FROM public.leads WHERE interested_project_id = :'proj_a';
  -- SELECT count(*) > 0 FROM public.registrations WHERE project_id = :'proj_a';
  -- SELECT count(*) > 0 FROM public.crm_tasks WHERE project_id = :'proj_a';
  -- SELECT count(*) > 0 FROM public.crm_activities WHERE project_id = :'proj_a';
  -- SELECT count(*) >= 0 FROM public.registration_reviews WHERE project_id = :'proj_a';
ROLLBACK;

-- Manager A cannot read project B
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'mgr_a', true);
  SET LOCAL ROLE authenticated;
  -- Expect: 0 rows
  -- SELECT count(*) FROM public.leads WHERE interested_project_id = :'proj_b';
ROLLBACK;

-- Salesperson A reads assigned lead / registration / task only
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'sp_a1', true);
  SET LOCAL ROLE authenticated;
  -- SELECT count(*) = 1 FROM public.leads WHERE id = :'lead_a1';
  -- SELECT count(*) = 1 FROM public.registrations WHERE id = :'reg_a1';
  -- SELECT count(*) = 1 FROM public.crm_tasks WHERE id = :'task_a1';
ROLLBACK;

-- Salesperson A cannot read unrelated project-A lead
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'sp_a2', true);
  SET LOCAL ROLE authenticated;
  -- SELECT count(*) = 0 FROM public.leads WHERE id = :'lead_a1';
ROLLBACK;

-- Project-B user cannot read project A
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'usr_b', true);
  SET LOCAL ROLE authenticated;
  -- SELECT count(*) = 0 FROM public.registrations WHERE project_id = :'proj_a';
ROLLBACK;

-- Inactive user — RPCs reject
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'inactive', true);
  SET LOCAL ROLE authenticated;
  -- SELECT public.get_operations_dashboard(NULL);  -- Expect: inactive_user
ROLLBACK;

-- Anon — RPC execute denied
BEGIN;
  SET LOCAL ROLE anon;
  -- SELECT public.search_leads();  -- Expect: permission denied for function
ROLLBACK;

-- Direct writes denied
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'mgr_a', true);
  SET LOCAL ROLE authenticated;
  -- INSERT INTO public.crm_activities(...) VALUES (...); -- Expect: policy violation
  -- INSERT INTO public.crm_tasks(...) VALUES (...);      -- Expect: policy violation
  -- INSERT INTO public.registration_reviews(...) VALUES (...); -- Expect: policy violation
  -- UPDATE public.leads SET status='converted' WHERE id = :'lead_a1'; -- Expect: policy violation
ROLLBACK;

-- search_assignable_users scoped
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'usr_b', true);
  SET LOCAL ROLE authenticated;
  -- SELECT public.search_assignable_users(:'proj_a', 'lead', NULL, 20);  -- Expect: permission_denied
ROLLBACK;

-- Notifications isolation
BEGIN;
  SELECT set_config('request.jwt.claim.sub', :'sp_a2', true);
  SET LOCAL ROLE authenticated;
  -- SELECT count(*) = 0 FROM public.notifications WHERE user_id = :'sp_a1';
ROLLBACK;
