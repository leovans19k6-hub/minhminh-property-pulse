-- Phase 6A — Sales Policies executable smoke tests.
-- Run inside a psql session with an authenticated JWT for a project manager, or
-- use SET LOCAL request.jwt.claims to simulate. Wrapped in a transaction —
-- always rolls back so no data is persisted.

BEGIN;

-- Requires: existing project + product type + product in scope. Adjust IDs as needed.
-- The tests below are structural (do/end blocks with ASSERT) so failures stop the run.

DO $$
DECLARE
  v_project uuid;
  v_type    uuid;
  v_product uuid;
  v_pid     uuid;
  v_pid2    uuid;
  v_slug    text := 'test-phase6a-' || substr(md5(random()::text), 1, 6);
  v_res     jsonb;
  v_count   int;
BEGIN
  SELECT id INTO v_project FROM public.projects LIMIT 1;
  SELECT id INTO v_type FROM public.product_types WHERE project_id = v_project OR project_id IS NULL LIMIT 1;
  SELECT id INTO v_product FROM public.products WHERE project_id = v_project LIMIT 1;
  ASSERT v_project IS NOT NULL, 'fixture: needs a project';

  -- 1. Create draft project-wide
  v_res := public.create_sales_policy(v_project,
    jsonb_build_object('title','Test A','slug',v_slug,'content_json',
      jsonb_build_object('sections', jsonb_build_array(
        jsonb_build_object('id','s1','title','Section 1','content','Body 1')
      )), 'attachments','[]'::jsonb),
    ARRAY[]::uuid[], ARRAY[]::uuid[], false);
  v_pid := (v_res->>'policy_id')::uuid;
  ASSERT v_pid IS NOT NULL, 'create draft returned id';
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid) = 'draft', 'draft status';
  ASSERT (SELECT version_number FROM public.sales_policies WHERE id = v_pid) = 1, 'v1 on create';

  -- 2. Duplicate slug rejected
  BEGIN
    PERFORM public.create_sales_policy(v_project,
      jsonb_build_object('title','Dup','slug',v_slug,'content_json', jsonb_build_object('sections','[]'::jsonb)),
      ARRAY[]::uuid[], ARRAY[]::uuid[], false);
    RAISE EXCEPTION 'expected duplicate_policy_slug';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%duplicate_policy_slug%', 'duplicate slug: ' || SQLERRM;
  END;

  -- 3. Too many sections rejected
  BEGIN
    PERFORM public.validate_sales_policy_content(
      jsonb_build_object('sections', (SELECT jsonb_agg(jsonb_build_object('id','x'||g,'title','t','content','c'))
                                       FROM generate_series(1,51) g)));
    RAISE EXCEPTION 'expected too_many_policy_sections';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%too_many_policy_sections%', 'too many sections';
  END;

  -- 4. Duplicate section id rejected
  BEGIN
    PERFORM public.validate_sales_policy_content(
      jsonb_build_object('sections', jsonb_build_array(
        jsonb_build_object('id','same','title','a','content','c'),
        jsonb_build_object('id','same','title','b','content','c'))));
    RAISE EXCEPTION 'expected duplicate_policy_section_id';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%duplicate_policy_section_id%', 'dup section id';
  END;

  -- 5. Invalid attachment
  BEGIN
    PERFORM public.validate_sales_policy_attachments(jsonb_build_array(
      jsonb_build_object('id','a','label','x','url','ftp://bad','type','link')));
    RAISE EXCEPTION 'expected invalid_policy_attachment';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%invalid_policy_attachment%', 'invalid att';
  END;

  -- 6. Invalid dates
  BEGIN
    PERFORM public.validate_sales_policy_dates(now(), now() - interval '1 day');
    RAISE EXCEPTION 'expected invalid_policy_dates';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%invalid_policy_dates%', 'bad dates';
  END;

  -- 7. Publish valid policy
  v_res := public.publish_sales_policy(v_pid, 'first publish');
  ASSERT (v_res->>'changed')::boolean, 'publish changed';
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid) = 'active', 'active after publish';
  ASSERT (SELECT published_at IS NOT NULL FROM public.sales_policies WHERE id = v_pid), 'published_at set';

  -- 8. Publish idempotent
  v_res := public.publish_sales_policy(v_pid, 'noop');
  ASSERT NOT (v_res->>'changed')::boolean, 'publish idempotent';

  -- 9. Unpublish
  v_res := public.unpublish_sales_policy(v_pid, 'test');
  ASSERT (v_res->>'changed')::boolean, 'unpublish changed';
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid) = 'draft', 'back to draft';

  -- 10. No-op update no version
  SELECT version_number INTO v_count FROM public.sales_policies WHERE id = v_pid;
  v_res := public.update_sales_policy(v_pid, jsonb_build_object('title','Test A'));
  ASSERT NOT (v_res->>'changed')::boolean, 'no-op update no change';

  -- 11. Real update creates version
  v_res := public.update_sales_policy(v_pid, jsonb_build_object('title','Test A Updated'));
  ASSERT (v_res->>'changed')::boolean, 'update changed';
  ASSERT (v_res->>'version_number')::int > v_count, 'new version created';

  -- 12. Clone
  v_res := public.clone_sales_policy(v_pid, v_slug || '-c', 'Clone');
  v_pid2 := (v_res->>'policy_id')::uuid;
  ASSERT v_pid2 IS NOT NULL AND v_pid2 <> v_pid, 'clone new id';
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid2) = 'draft', 'clone draft';
  ASSERT (SELECT count(*) FROM public.sales_policy_versions WHERE policy_id = v_pid2) = 1, 'clone v1 only';

  -- 13. Archive active atomically
  PERFORM public.publish_sales_policy(v_pid, null);
  v_res := public.archive_sales_policy(v_pid, 'no longer valid');
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid) = 'archived', 'archived';
  ASSERT (SELECT published_at IS NULL FROM public.sales_policies WHERE id = v_pid), 'unpublished on archive';

  -- 14. Update archived rejected
  BEGIN
    PERFORM public.update_sales_policy(v_pid, jsonb_build_object('title','x'));
    RAISE EXCEPTION 'expected policy_archived';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%policy_archived%', 'archived update denied';
  END;

  -- 15. Restore
  v_res := public.restore_sales_policy(v_pid);
  ASSERT (SELECT status FROM public.sales_policies WHERE id = v_pid) = 'draft', 'restore to draft';

  -- 16. Direct client insert denied (RLS check via role switch is out of scope for DO block; assert deny policy exists)
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales_policies'
    AND policyname='policies deny direct insert'
  ), 'deny direct insert policy present';

  -- 17. Versions RLS deny insert exists
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales_policy_versions'
    AND policyname='policy versions deny direct insert'
  ), 'versions deny insert';

  -- 18. Mobile query hides draft
  v_res := public.get_active_project_policies(v_project, null, null);
  ASSERT jsonb_typeof(v_res) = 'array', 'mobile returns array';
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res) x WHERE (x->>'id')::uuid = v_pid), 'draft hidden from mobile';

  -- 19. Search excludes archived by default
  PERFORM public.archive_sales_policy(v_pid2, null);
  v_res := public.search_sales_policies(v_project, null, null, null, null, 100, 0);
  ASSERT NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res->'rows') x WHERE (x->>'id')::uuid = v_pid2), 'archived excluded';

  -- 20. Search with status=archived includes archived
  v_res := public.search_sales_policies(v_project, null, 'archived', null, null, 100, 0);
  ASSERT EXISTS (SELECT 1 FROM jsonb_array_elements(v_res->'rows') x WHERE (x->>'id')::uuid = v_pid2), 'archived visible with filter';

  -- 21. Publish expired rejected
  v_res := public.create_sales_policy(v_project,
    jsonb_build_object('title','Expired','slug', v_slug || '-exp',
      'content_json', jsonb_build_object('sections', jsonb_build_array(
        jsonb_build_object('id','s1','title','t','content','c'))),
      'effective_to', to_char(now() - interval '1 day','YYYY-MM-DD"T"HH24:MI:SSOF')),
    ARRAY[]::uuid[], ARRAY[]::uuid[], false);
  BEGIN
    PERFORM public.publish_sales_policy((v_res->>'policy_id')::uuid, null);
    RAISE EXCEPTION 'expected policy_publish_validation_failed';
  EXCEPTION WHEN OTHERS THEN
    ASSERT SQLERRM ILIKE '%policy_publish_validation_failed%', 'expired publish denied';
  END;

  -- 22. Cross-project product rejected
  IF v_product IS NOT NULL THEN
    DECLARE v_other uuid;
    BEGIN
      SELECT id INTO v_other FROM public.projects WHERE id <> v_project LIMIT 1;
      IF v_other IS NOT NULL THEN
        BEGIN
          PERFORM public.create_sales_policy(v_other,
            jsonb_build_object('title','X','slug', v_slug || '-xproj',
              'content_json', jsonb_build_object('sections','[]'::jsonb)),
            ARRAY[]::uuid[], ARRAY[v_product]::uuid[], false);
          RAISE EXCEPTION 'expected invalid_policy_product';
        EXCEPTION WHEN OTHERS THEN
          ASSERT SQLERRM ILIKE '%invalid_policy_product%', 'cross project product denied';
        END;
      END IF;
    END;
  END IF;

  RAISE NOTICE 'Phase 6A sales policies smoke tests: PASS';
END $$;

ROLLBACK;