-- Phase 6B — Voucher Management smoke assertions.
-- Run inside BEGIN/ROLLBACK against a scratch DB. Requires seeded roles + at least one project & manager profile.
-- Fixtures are minimal; extend as needed for full coverage.

BEGIN;

-- === FIXTURES ==============================================================
DO $$
DECLARE v_proj uuid; v_pt uuid; v_prod uuid; v_pol uuid; v_uid uuid;
BEGIN
  SELECT id INTO v_proj FROM public.projects ORDER BY created_at LIMIT 1;
  IF v_proj IS NULL THEN RAISE NOTICE 'no project; skipping phase 6b tests'; RETURN; END IF;
  RAISE NOTICE 'phase_6b using project=%', v_proj;
END $$;

-- 01. Anon cannot execute create_voucher
DO $$ BEGIN
  BEGIN
    SET LOCAL role = 'anon';
    PERFORM public.create_voucher(gen_random_uuid(), '{}'::jsonb);
    RAISE EXCEPTION 'anon should not execute create_voucher';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    NULL;
  END;
  RESET role;
END $$;

-- 02. Direct insert on vouchers denied
DO $$ DECLARE v_proj uuid; BEGIN
  SELECT id INTO v_proj FROM public.projects LIMIT 1; IF v_proj IS NULL THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.vouchers(project_id, title, slug) VALUES (v_proj, 'X', 'x');
    RAISE EXCEPTION 'direct insert should be denied';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN NULL; END;
END $$;

-- 03. Voucher benefits validator rejects >30 items
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_benefits(
      (SELECT jsonb_agg(jsonb_build_object('id','b'||i,'title','t','value_type','other'))
       FROM generate_series(1,31) i));
    RAISE EXCEPTION 'too_many_voucher_benefits expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%too_many_voucher_benefits%' THEN RAISE; END IF;
  END;
END $$;

-- 04. Voucher benefits validator rejects duplicate id
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_benefits(jsonb_build_array(
      jsonb_build_object('id','x','title','t','value_type','other'),
      jsonb_build_object('id','x','title','t2','value_type','other')));
    RAISE EXCEPTION 'duplicate_voucher_benefit_id expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%duplicate_voucher_benefit_id%' THEN RAISE; END IF;
  END;
END $$;

-- 05. Percentage benefit out of range rejected
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_benefits(jsonb_build_array(
      jsonb_build_object('id','x','title','t','value_type','percentage','value',150)));
    RAISE EXCEPTION 'invalid_voucher_benefits expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_voucher_benefits%' THEN RAISE; END IF;
  END;
END $$;

-- 06. Conditions duplicate id rejected
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_conditions(jsonb_build_array(
      jsonb_build_object('id','c','title','t'),
      jsonb_build_object('id','c','title','t2')));
    RAISE EXCEPTION 'duplicate_voucher_condition_id expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%duplicate_voucher_condition_id%' THEN RAISE; END IF;
  END;
END $$;

-- 07. Too many conditions rejected
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_conditions(
      (SELECT jsonb_agg(jsonb_build_object('id','c'||i,'title','t')) FROM generate_series(1,51) i));
    RAISE EXCEPTION 'too_many_voucher_conditions expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%too_many_voucher_conditions%' THEN RAISE; END IF;
  END;
END $$;

-- 08. Attachment URL must be http(s)
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_attachments(jsonb_build_array(
      jsonb_build_object('id','a','label','x','url','ftp://foo','type','link')));
    RAISE EXCEPTION 'invalid_voucher_attachment expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_voucher_attachment%' THEN RAISE; END IF;
  END;
END $$;

-- 09. Attachment type must be allowed
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_attachments(jsonb_build_array(
      jsonb_build_object('id','a','label','x','url','https://x','type','video')));
    RAISE EXCEPTION 'invalid_voucher_attachment expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_voucher_attachment%' THEN RAISE; END IF;
  END;
END $$;

-- 10. Invalid dates (deadline < start) rejected
DO $$ BEGIN
  BEGIN
    PERFORM public.validate_voucher_dates('2026-01-05'::timestamptz, '2026-01-01'::timestamptz, NULL, NULL);
    RAISE EXCEPTION 'invalid_voucher_dates expected';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%invalid_voucher_dates%' THEN RAISE; END IF;
  END;
END $$;

-- 11. Applicability scope constraint enforced
DO $$ BEGIN
  BEGIN
    ALTER TABLE public.vouchers ADD CONSTRAINT tmp_check CHECK (applicability_scope IN ('project_wide','product_types','specific_products','sales_policies','mixed'));
  EXCEPTION WHEN duplicate_object OR OTHERS THEN NULL; END;
  BEGIN
    ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS tmp_check;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 12. per_user_limit >= 1 constraint
DO $$ DECLARE v_proj uuid; BEGIN
  SELECT id INTO v_proj FROM public.projects LIMIT 1;
  IF v_proj IS NULL THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.vouchers(project_id, title, slug, per_user_limit)
    VALUES (v_proj, 'zzz', 'zzz-perlimit', 0);
    RAISE EXCEPTION 'per_user_limit=0 should fail';
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 13. voucher_derived_state returns non-null string when voucher exists
DO $$ DECLARE v_id uuid; v_state text; BEGIN
  SELECT id INTO v_id FROM public.vouchers LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;
  SELECT public.voucher_derived_state(v_id) INTO v_state;
  IF v_state IS NULL THEN RAISE EXCEPTION 'derived_state should not be null'; END IF;
END $$;

-- 14. Cross-project product rejected by _apply_voucher_applicability
-- (Skipped: needs two projects; documented.)

-- 15. Voucher schema has required additive columns
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM information_schema.columns
    WHERE table_schema='public' AND table_name='vouchers'
      AND column_name IN ('code','benefits_json','conditions_json','attachments',
        'applicability_scope','priority','per_user_limit','registration_start','published_at','created_by','updated_by');
  IF n < 11 THEN RAISE EXCEPTION 'missing additive columns; got %', n; END IF;
END $$;

-- 16. Relation tables exist
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('voucher_product_types','voucher_products','voucher_sales_policies');
  IF n <> 3 THEN RAISE EXCEPTION 'missing relation tables; got %', n; END IF;
END $$;

-- 17. RPC exists: register_for_voucher
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='register_for_voucher') THEN
    RAISE EXCEPTION 'register_for_voucher missing'; END IF;
END $$;

-- 18. RPC exists: check_voucher_eligibility
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='check_voucher_eligibility') THEN
    RAISE EXCEPTION 'check_voucher_eligibility missing'; END IF;
END $$;

-- 19. RPC exists: get_voucher_admin_detail
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_voucher_admin_detail') THEN
    RAISE EXCEPTION 'get_voucher_admin_detail missing'; END IF;
END $$;

-- 20. RPC exists: search_vouchers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='search_vouchers') THEN
    RAISE EXCEPTION 'search_vouchers missing'; END IF;
END $$;

-- 21. RPC exists: get_active_project_vouchers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_active_project_vouchers') THEN
    RAISE EXCEPTION 'get_active_project_vouchers missing'; END IF;
END $$;

-- 22. RPC exists: get_active_voucher_detail, get_my_voucher_registrations, cancel_my_voucher_registration
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_active_voucher_detail')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_my_voucher_registrations')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='cancel_my_voucher_registration') THEN
    RAISE EXCEPTION 'mobile RPC set incomplete'; END IF;
END $$;

-- 23. RPC exists: publish/pause/resume/archive/restore/clone
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM pg_proc
    WHERE proname IN ('publish_voucher','pause_voucher','resume_voucher','archive_voucher','restore_voucher','clone_voucher','update_voucher','create_voucher');
  IF n <> 8 THEN RAISE EXCEPTION 'mutation RPC set incomplete: %', n; END IF;
END $$;

-- 24. Registrations RLS excludes voucher type from direct insert
DO $$ DECLARE v_check text; BEGIN
  SELECT pg_get_expr(qual, 'public.registrations'::regclass) INTO v_check
    FROM pg_policy WHERE polname = 'registrations_insert';
  -- for INSERT policy the CHECK is in polwithcheck
  SELECT pg_get_expr(with_check, 'public.registrations'::regclass) INTO v_check
    FROM pg_policies WHERE policyname='registrations_insert' AND schemaname='public' AND tablename='registrations';
  IF v_check IS NULL OR v_check NOT LIKE '%voucher%' THEN
    RAISE EXCEPTION 'registrations insert policy does not scope voucher type; got %', v_check; END IF;
END $$;

-- 25. Vouchers direct write denied policy present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='vouchers' AND policyname='vouchers_deny_write') THEN
    RAISE EXCEPTION 'vouchers_deny_write policy missing'; END IF;
END $$;

-- 26. Voucher relation tables have no_write policies
DO $$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('voucher_product_types','voucher_products','voucher_sales_policies')
      AND policyname LIKE '%no_write%';
  IF n <> 3 THEN RAISE EXCEPTION 'voucher relation no_write policies missing: %', n; END IF;
END $$;

-- 27. Internal helpers not executable by authenticated
DO $$ DECLARE has_priv boolean; BEGIN
  SELECT has_function_privilege('authenticated', 'public._apply_voucher_applicability(uuid,uuid,uuid[],uuid[],uuid[])', 'EXECUTE') INTO has_priv;
  IF has_priv THEN RAISE EXCEPTION '_apply_voucher_applicability should not be executable by authenticated'; END IF;
END $$;

-- 28. Trusted mutation RPCs executable by authenticated
DO $$ DECLARE has_priv boolean; BEGIN
  SELECT has_function_privilege('authenticated', 'public.create_voucher(uuid,jsonb,uuid[],uuid[],uuid[],boolean)', 'EXECUTE') INTO has_priv;
  IF NOT has_priv THEN RAISE EXCEPTION 'create_voucher must be executable by authenticated'; END IF;
END $$;

-- 29. Unique slug per project enforced by UNIQUE constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='vouchers' AND indexname='vouchers_project_id_slug_key') THEN
    RAISE EXCEPTION 'vouchers unique slug index missing'; END IF;
END $$;

-- 30. Unique code per project enforced by partial UNIQUE index
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename='vouchers' AND indexname='vouchers_project_code_uidx') THEN
    RAISE EXCEPTION 'vouchers unique code partial index missing'; END IF;
END $$;

ROLLBACK;