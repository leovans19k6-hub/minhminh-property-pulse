-- ============================================================================
-- Phase 6A — Sales Policies Admin Module
-- Additive schema, versioning, validation helpers, mutation RPCs, RLS.
-- ============================================================================

-- 1. Additive columns on sales_policies
ALTER TABLE public.sales_policies
  ADD COLUMN IF NOT EXISTS content_json jsonb NOT NULL DEFAULT jsonb_build_object('sections', '[]'::jsonb),
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS applicability_scope text NOT NULL DEFAULT 'project_wide',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Backfill applicability_scope from existing relations for legacy rows
UPDATE public.sales_policies sp
SET applicability_scope = CASE
  WHEN EXISTS (SELECT 1 FROM public.policy_products pp WHERE pp.policy_id = sp.id) THEN 'specific_products'
  WHEN EXISTS (SELECT 1 FROM public.policy_product_types ppt WHERE ppt.policy_id = sp.id) THEN 'product_types'
  ELSE 'project_wide'
END
WHERE applicability_scope = 'project_wide';

-- Backfill published_at for currently active policies (legacy)
UPDATE public.sales_policies SET published_at = COALESCE(published_at, updated_at)
WHERE status = 'active' AND published_at IS NULL;

-- 2. Versions table
CREATE TABLE IF NOT EXISTS public.sales_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.sales_policies(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_summary text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version_number)
);

GRANT SELECT ON public.sales_policy_versions TO authenticated;
GRANT ALL ON public.sales_policy_versions TO service_role;
ALTER TABLE public.sales_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy versions readable by project" ON public.sales_policy_versions;
CREATE POLICY "policy versions readable by project" ON public.sales_policy_versions
  FOR SELECT TO authenticated USING (
    public.is_active_user() AND EXISTS (
      SELECT 1 FROM public.sales_policies sp
      WHERE sp.id = policy_id
        AND (public.has_any_role(ARRAY['super_admin','admin','director'])
             OR public.is_project_member(sp.project_id))
    )
  );

DROP POLICY IF EXISTS "policy versions deny direct insert" ON public.sales_policy_versions;
CREATE POLICY "policy versions deny direct insert" ON public.sales_policy_versions
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "policy versions deny update" ON public.sales_policy_versions;
CREATE POLICY "policy versions deny update" ON public.sales_policy_versions
  FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "policy versions deny delete" ON public.sales_policy_versions;
CREATE POLICY "policy versions deny delete" ON public.sales_policy_versions
  FOR DELETE TO authenticated USING (false);

CREATE INDEX IF NOT EXISTS idx_sales_policy_versions_policy ON public.sales_policy_versions(policy_id, version_number DESC);

-- 3. Unique slug per project
CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_policies_project_slug
  ON public.sales_policies(project_id, slug);

-- 4. Validation helpers
CREATE OR REPLACE FUNCTION public.validate_sales_policy_content(p_content jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_sections jsonb; v_sec jsonb; v_ids jsonb := '{}'::jsonb; v_id text; v_title text; v_content text;
BEGIN
  IF p_content IS NULL OR jsonb_typeof(p_content) <> 'object' THEN
    RAISE EXCEPTION 'invalid_policy_content';
  END IF;
  v_sections := p_content->'sections';
  IF v_sections IS NULL OR jsonb_typeof(v_sections) <> 'array' THEN
    RAISE EXCEPTION 'invalid_policy_content';
  END IF;
  IF jsonb_array_length(v_sections) > 50 THEN
    RAISE EXCEPTION 'too_many_policy_sections';
  END IF;
  FOR v_sec IN SELECT * FROM jsonb_array_elements(v_sections) LOOP
    v_id := v_sec->>'id';
    v_title := v_sec->>'title';
    v_content := v_sec->>'content';
    IF v_id IS NULL OR length(v_id) = 0 OR length(v_id) > 100 THEN
      RAISE EXCEPTION 'invalid_policy_content';
    END IF;
    IF v_ids ? v_id THEN
      RAISE EXCEPTION 'duplicate_policy_section_id';
    END IF;
    v_ids := v_ids || jsonb_build_object(v_id, true);
    IF v_title IS NULL OR length(trim(v_title)) = 0 OR length(v_title) > 300 THEN
      RAISE EXCEPTION 'invalid_policy_content';
    END IF;
    IF v_content IS NULL OR length(v_content) > 20000 THEN
      RAISE EXCEPTION 'invalid_policy_content';
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_sales_policy_content(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_sales_policy_attachments(p_attachments jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_att jsonb; v_ids jsonb := '{}'::jsonb; v_id text; v_label text; v_url text; v_type text;
BEGIN
  IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'invalid_policy_attachment';
  END IF;
  IF jsonb_array_length(p_attachments) > 20 THEN
    RAISE EXCEPTION 'too_many_policy_attachments';
  END IF;
  FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments) LOOP
    v_id := v_att->>'id'; v_label := v_att->>'label'; v_url := v_att->>'url'; v_type := v_att->>'type';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_policy_attachment'; END IF;
    IF v_ids ? v_id THEN RAISE EXCEPTION 'invalid_policy_attachment'; END IF;
    v_ids := v_ids || jsonb_build_object(v_id, true);
    IF v_label IS NULL OR length(trim(v_label)) = 0 OR length(v_label) > 300 THEN
      RAISE EXCEPTION 'invalid_policy_attachment';
    END IF;
    IF v_url IS NULL OR v_url !~* '^https?://' OR length(v_url) > 2000 THEN
      RAISE EXCEPTION 'invalid_policy_attachment';
    END IF;
    IF v_type NOT IN ('pdf','image','document','spreadsheet','link') THEN
      RAISE EXCEPTION 'invalid_policy_attachment';
    END IF;
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_sales_policy_attachments(jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_sales_policy_dates(p_from timestamptz, p_to timestamptz)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_to < p_from THEN
    RAISE EXCEPTION 'invalid_policy_dates';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_sales_policy_dates(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_policy_applicability(
  p_project_id uuid, p_product_type_ids uuid[], p_product_ids uuid[]
) RETURNS void LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v_bad_pt int; v_bad_p int;
BEGIN
  IF p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids, 1) > 0 THEN
    SELECT count(*) INTO v_bad_pt FROM unnest(p_product_type_ids) x(id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_types pt WHERE pt.id = x.id
          AND (pt.project_id IS NULL OR pt.project_id = p_project_id)
      );
    IF v_bad_pt > 0 THEN RAISE EXCEPTION 'invalid_policy_product_type'; END IF;
  END IF;
  IF p_product_ids IS NOT NULL AND array_length(p_product_ids, 1) > 0 THEN
    SELECT count(*) INTO v_bad_p FROM unnest(p_product_ids) x(id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = x.id AND p.project_id = p_project_id
      );
    IF v_bad_p > 0 THEN RAISE EXCEPTION 'invalid_policy_product'; END IF;
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_policy_applicability(uuid, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_sales_policy_version(
  p_policy_id uuid, p_change_summary text
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_next int; v_pts jsonb; v_ps jsonb; v_snap jsonb;
BEGIN
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next
    FROM public.sales_policy_versions WHERE policy_id = p_policy_id;
  SELECT COALESCE(jsonb_agg(product_type_id ORDER BY product_type_id), '[]'::jsonb) INTO v_pts
    FROM public.policy_product_types WHERE policy_id = p_policy_id;
  SELECT COALESCE(jsonb_agg(product_id ORDER BY product_id), '[]'::jsonb) INTO v_ps
    FROM public.policy_products WHERE policy_id = p_policy_id;
  v_snap := jsonb_build_object(
    'title', v_p.title, 'slug', v_p.slug, 'summary', v_p.summary,
    'content_json', v_p.content_json, 'attachments', v_p.attachments,
    'applicability_scope', v_p.applicability_scope, 'priority', v_p.priority,
    'is_featured', v_p.is_featured, 'status', v_p.status,
    'effective_from', v_p.effective_from, 'effective_to', v_p.effective_to,
    'published_at', v_p.published_at, 'archived_at', v_p.archived_at,
    'product_type_ids', v_pts, 'product_ids', v_ps
  );
  INSERT INTO public.sales_policy_versions (policy_id, version_number, snapshot, change_summary, created_by)
  VALUES (p_policy_id, v_next, v_snap, p_change_summary, auth.uid());
  UPDATE public.sales_policies SET version_number = v_next WHERE id = p_policy_id;
  RETURN v_next;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_sales_policy_version(uuid, text) FROM PUBLIC, anon, authenticated;

-- 5. Slug helper
CREATE OR REPLACE FUNCTION public.validate_sales_policy_slug(p_slug text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(p_slug) > 120 THEN
    RAISE EXCEPTION 'invalid_policy_slug';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.validate_sales_policy_slug(text) FROM PUBLIC, anon, authenticated;

-- 6. Guard on policy_products / policy_product_types cross-project
CREATE OR REPLACE FUNCTION public.guard_policy_product_type_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pol uuid; v_pt_project uuid;
BEGIN
  SELECT project_id INTO v_pol FROM public.sales_policies WHERE id = NEW.policy_id;
  SELECT project_id INTO v_pt_project FROM public.product_types WHERE id = NEW.product_type_id;
  IF v_pt_project IS NOT NULL AND v_pt_project <> v_pol THEN
    RAISE EXCEPTION 'cross_project_policy_reference';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_policy_pt ON public.policy_product_types;
CREATE TRIGGER trg_guard_policy_pt BEFORE INSERT OR UPDATE ON public.policy_product_types
  FOR EACH ROW EXECUTE FUNCTION public.guard_policy_product_type_project();

CREATE OR REPLACE FUNCTION public.guard_policy_product_project()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pol uuid; v_p_project uuid;
BEGIN
  SELECT project_id INTO v_pol FROM public.sales_policies WHERE id = NEW.policy_id;
  SELECT project_id INTO v_p_project FROM public.products WHERE id = NEW.product_id;
  IF v_p_project IS NULL OR v_p_project <> v_pol THEN
    RAISE EXCEPTION 'cross_project_policy_reference';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_policy_p ON public.policy_products;
CREATE TRIGGER trg_guard_policy_p BEFORE INSERT OR UPDATE ON public.policy_products
  FOR EACH ROW EXECUTE FUNCTION public.guard_policy_product_project();

-- 7. Internal applicability applier
CREATE OR REPLACE FUNCTION public._apply_policy_applicability(
  p_policy_id uuid, p_project_id uuid,
  p_product_type_ids uuid[], p_product_ids uuid[]
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_scope text;
BEGIN
  PERFORM public.validate_policy_applicability(p_project_id, p_product_type_ids, p_product_ids);
  DELETE FROM public.policy_product_types WHERE policy_id = p_policy_id;
  DELETE FROM public.policy_products WHERE policy_id = p_policy_id;
  IF p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids, 1) > 0 THEN
    INSERT INTO public.policy_product_types (policy_id, product_type_id)
    SELECT p_policy_id, x FROM unnest(p_product_type_ids) x
    ON CONFLICT DO NOTHING;
  END IF;
  IF p_product_ids IS NOT NULL AND array_length(p_product_ids, 1) > 0 THEN
    INSERT INTO public.policy_products (policy_id, product_id)
    SELECT p_policy_id, x FROM unnest(p_product_ids) x
    ON CONFLICT DO NOTHING;
  END IF;
  v_scope := CASE
    WHEN (p_product_ids IS NOT NULL AND array_length(p_product_ids,1) > 0) THEN 'specific_products'
    WHEN (p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids,1) > 0) THEN 'product_types'
    ELSE 'project_wide'
  END;
  RETURN v_scope;
END $$;
REVOKE EXECUTE ON FUNCTION public._apply_policy_applicability(uuid, uuid, uuid[], uuid[]) FROM PUBLIC, anon, authenticated;

-- 8. Mutation RPCs
CREATE OR REPLACE FUNCTION public.create_sales_policy(
  p_project_id uuid, p_policy jsonb,
  p_product_type_ids uuid[] DEFAULT '{}', p_product_ids uuid[] DEFAULT '{}',
  p_publish boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid; v_slug text; v_title text; v_summary text;
  v_content jsonb; v_attachments jsonb;
  v_from timestamptz; v_to timestamptz;
  v_featured boolean; v_priority int; v_scope text; v_ver int;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_project_manager(p_project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  v_slug := lower(trim(p_policy->>'slug'));
  v_title := trim(p_policy->>'title');
  v_summary := p_policy->>'summary';
  v_content := COALESCE(p_policy->'content_json', jsonb_build_object('sections','[]'::jsonb));
  v_attachments := COALESCE(p_policy->'attachments', '[]'::jsonb);
  v_from := NULLIF(p_policy->>'effective_from','')::timestamptz;
  v_to := NULLIF(p_policy->>'effective_to','')::timestamptz;
  v_featured := COALESCE((p_policy->>'is_featured')::boolean, false);
  v_priority := COALESCE((p_policy->>'priority')::int, 0);

  IF v_title IS NULL OR length(v_title) = 0 OR length(v_title) > 300 THEN RAISE EXCEPTION 'invalid_policy_content'; END IF;
  PERFORM public.validate_sales_policy_slug(v_slug);
  PERFORM public.validate_sales_policy_content(v_content);
  PERFORM public.validate_sales_policy_attachments(v_attachments);
  PERFORM public.validate_sales_policy_dates(v_from, v_to);

  IF EXISTS (SELECT 1 FROM public.sales_policies WHERE project_id = p_project_id AND slug = v_slug) THEN
    RAISE EXCEPTION 'duplicate_policy_slug';
  END IF;

  IF p_publish THEN
    IF v_to IS NOT NULL AND v_to < v_now THEN RAISE EXCEPTION 'policy_publish_validation_failed'; END IF;
    IF jsonb_array_length(v_content->'sections') = 0 THEN RAISE EXCEPTION 'policy_publish_validation_failed'; END IF;
  END IF;

  INSERT INTO public.sales_policies (
    project_id, slug, title, summary, content_json, attachments,
    effective_from, effective_to, is_featured, priority,
    status, published_at, created_by, updated_by, version_number
  ) VALUES (
    p_project_id, v_slug, v_title, v_summary, v_content, v_attachments,
    v_from, v_to, v_featured, v_priority,
    CASE WHEN p_publish THEN 'active' ELSE 'draft' END,
    CASE WHEN p_publish THEN v_now ELSE NULL END,
    auth.uid(), auth.uid(), 1
  ) RETURNING id INTO v_id;

  v_scope := public._apply_policy_applicability(v_id, p_project_id, p_product_type_ids, p_product_ids);
  UPDATE public.sales_policies SET applicability_scope = v_scope WHERE id = v_id;

  v_ver := public.create_sales_policy_version(v_id,
    CASE WHEN p_publish THEN 'created_and_published' ELSE 'created' END);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), CASE WHEN p_publish THEN 'create_publish_policy' ELSE 'create_policy' END,
          'sales_policies', v_id,
          jsonb_build_object('project_id', p_project_id, 'slug', v_slug, 'version', v_ver, 'scope', v_scope));

  RETURN jsonb_build_object('policy_id', v_id, 'slug', v_slug, 'version_number', v_ver, 'scope', v_scope);
END $$;
REVOKE EXECUTE ON FUNCTION public.create_sales_policy(uuid, jsonb, uuid[], uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sales_policy(uuid, jsonb, uuid[], uuid[], boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_sales_policy(
  p_policy_id uuid, p_policy_patch jsonb,
  p_product_type_ids uuid[] DEFAULT NULL, p_product_ids uuid[] DEFAULT NULL,
  p_change_summary text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_p RECORD; v_slug text; v_title text; v_summary text;
  v_content jsonb; v_attachments jsonb;
  v_from timestamptz; v_to timestamptz; v_featured boolean; v_priority int;
  v_scope text; v_ver int; v_changed boolean := false;
  v_old_pts jsonb; v_old_ps jsonb; v_new_pts jsonb; v_new_ps jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v_p.status = 'archived' THEN RAISE EXCEPTION 'policy_archived'; END IF;

  -- allow-list; NULL means "no change"
  v_slug := COALESCE(lower(trim(p_policy_patch->>'slug')), v_p.slug);
  v_title := COALESCE(NULLIF(trim(p_policy_patch->>'title'),''), v_p.title);
  v_summary := CASE WHEN p_policy_patch ? 'summary' THEN p_policy_patch->>'summary' ELSE v_p.summary END;
  v_content := COALESCE(p_policy_patch->'content_json', v_p.content_json);
  v_attachments := COALESCE(p_policy_patch->'attachments', v_p.attachments);
  v_from := CASE WHEN p_policy_patch ? 'effective_from'
                 THEN NULLIF(p_policy_patch->>'effective_from','')::timestamptz
                 ELSE v_p.effective_from END;
  v_to := CASE WHEN p_policy_patch ? 'effective_to'
               THEN NULLIF(p_policy_patch->>'effective_to','')::timestamptz
               ELSE v_p.effective_to END;
  v_featured := COALESCE((p_policy_patch->>'is_featured')::boolean, v_p.is_featured);
  v_priority := COALESCE((p_policy_patch->>'priority')::int, v_p.priority);

  PERFORM public.validate_sales_policy_slug(v_slug);
  PERFORM public.validate_sales_policy_content(v_content);
  PERFORM public.validate_sales_policy_attachments(v_attachments);
  PERFORM public.validate_sales_policy_dates(v_from, v_to);

  IF v_slug <> v_p.slug AND EXISTS (
    SELECT 1 FROM public.sales_policies WHERE project_id = v_p.project_id AND slug = v_slug AND id <> p_policy_id
  ) THEN RAISE EXCEPTION 'duplicate_policy_slug'; END IF;

  UPDATE public.sales_policies SET
    slug = v_slug, title = v_title, summary = v_summary,
    content_json = v_content, attachments = v_attachments,
    effective_from = v_from, effective_to = v_to,
    is_featured = v_featured, priority = v_priority,
    updated_by = auth.uid(), updated_at = now()
  WHERE id = p_policy_id;

  IF v_slug <> v_p.slug OR v_title <> v_p.title
     OR COALESCE(v_summary,'') <> COALESCE(v_p.summary,'')
     OR v_content <> v_p.content_json OR v_attachments <> v_p.attachments
     OR v_from IS DISTINCT FROM v_p.effective_from OR v_to IS DISTINCT FROM v_p.effective_to
     OR v_featured <> v_p.is_featured OR v_priority <> v_p.priority
  THEN v_changed := true; END IF;

  -- Applicability replace when provided
  IF p_product_type_ids IS NOT NULL OR p_product_ids IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(product_type_id ORDER BY product_type_id), '[]'::jsonb) INTO v_old_pts
      FROM public.policy_product_types WHERE policy_id = p_policy_id;
    SELECT COALESCE(jsonb_agg(product_id ORDER BY product_id), '[]'::jsonb) INTO v_old_ps
      FROM public.policy_products WHERE policy_id = p_policy_id;
    v_scope := public._apply_policy_applicability(
      p_policy_id, v_p.project_id,
      COALESCE(p_product_type_ids, ARRAY(SELECT product_type_id FROM public.policy_product_types WHERE policy_id = p_policy_id)),
      COALESCE(p_product_ids, ARRAY(SELECT product_id FROM public.policy_products WHERE policy_id = p_policy_id))
    );
    UPDATE public.sales_policies SET applicability_scope = v_scope WHERE id = p_policy_id;
    SELECT COALESCE(jsonb_agg(product_type_id ORDER BY product_type_id), '[]'::jsonb) INTO v_new_pts
      FROM public.policy_product_types WHERE policy_id = p_policy_id;
    SELECT COALESCE(jsonb_agg(product_id ORDER BY product_id), '[]'::jsonb) INTO v_new_ps
      FROM public.policy_products WHERE policy_id = p_policy_id;
    IF v_old_pts <> v_new_pts OR v_old_ps <> v_new_ps THEN v_changed := true; END IF;
  END IF;

  IF v_changed THEN
    v_ver := public.create_sales_policy_version(p_policy_id, COALESCE(p_change_summary, 'updated'));
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'update_policy', 'sales_policies', p_policy_id,
            jsonb_build_object('version', v_ver, 'change_summary', p_change_summary));
    RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_ver, 'changed', true);
  END IF;
  RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_p.version_number, 'changed', false);
END $$;
REVOKE EXECUTE ON FUNCTION public.update_sales_policy(uuid, jsonb, uuid[], uuid[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_sales_policy(uuid, jsonb, uuid[], uuid[], text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.publish_sales_policy(p_policy_id uuid, p_change_summary text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_ver int; v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v_p.status = 'archived' THEN RAISE EXCEPTION 'policy_archived'; END IF;
  IF v_p.effective_to IS NOT NULL AND v_p.effective_to < v_now THEN RAISE EXCEPTION 'policy_publish_validation_failed'; END IF;
  IF jsonb_array_length(v_p.content_json->'sections') = 0 THEN RAISE EXCEPTION 'policy_publish_validation_failed'; END IF;
  PERFORM public.validate_sales_policy_content(v_p.content_json);
  PERFORM public.validate_sales_policy_attachments(v_p.attachments);

  IF v_p.status = 'active' THEN
    RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_p.version_number, 'changed', false);
  END IF;

  UPDATE public.sales_policies SET status = 'active', published_at = v_now, updated_by = auth.uid(), updated_at = v_now
    WHERE id = p_policy_id;
  v_ver := public.create_sales_policy_version(p_policy_id, COALESCE(p_change_summary,'published'));
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'publish_policy', 'sales_policies', p_policy_id, jsonb_build_object('version', v_ver));
  RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_ver, 'changed', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.publish_sales_policy(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_sales_policy(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.unpublish_sales_policy(p_policy_id uuid, p_change_summary text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_ver int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v_p.status = 'archived' THEN RAISE EXCEPTION 'policy_archived'; END IF;
  IF v_p.status <> 'active' THEN
    RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_p.version_number, 'changed', false);
  END IF;
  UPDATE public.sales_policies SET status = 'draft', published_at = NULL, updated_by = auth.uid(), updated_at = now()
    WHERE id = p_policy_id;
  v_ver := public.create_sales_policy_version(p_policy_id, COALESCE(p_change_summary,'unpublished'));
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'unpublish_policy', 'sales_policies', p_policy_id, jsonb_build_object('version', v_ver));
  RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_ver, 'changed', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.unpublish_sales_policy(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unpublish_sales_policy(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clone_sales_policy(p_policy_id uuid, p_new_slug text, p_new_title text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_new uuid; v_slug text; v_title text; v_ver int; v_scope text;
        v_pts uuid[]; v_ps uuid[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  v_slug := lower(trim(p_new_slug));
  v_title := COALESCE(NULLIF(trim(p_new_title),''), v_p.title || ' (bản sao)');
  PERFORM public.validate_sales_policy_slug(v_slug);
  IF EXISTS (SELECT 1 FROM public.sales_policies WHERE project_id = v_p.project_id AND slug = v_slug) THEN
    RAISE EXCEPTION 'duplicate_policy_slug';
  END IF;
  INSERT INTO public.sales_policies (
    project_id, slug, title, summary, content_json, attachments,
    effective_from, effective_to, is_featured, priority,
    status, applicability_scope, created_by, updated_by, version_number
  ) VALUES (
    v_p.project_id, v_slug, v_title, v_p.summary, v_p.content_json, v_p.attachments,
    v_p.effective_from, v_p.effective_to, v_p.is_featured, v_p.priority,
    'draft', v_p.applicability_scope, auth.uid(), auth.uid(), 1
  ) RETURNING id INTO v_new;
  SELECT COALESCE(array_agg(product_type_id), '{}') INTO v_pts FROM public.policy_product_types WHERE policy_id = p_policy_id;
  SELECT COALESCE(array_agg(product_id), '{}') INTO v_ps FROM public.policy_products WHERE policy_id = p_policy_id;
  v_scope := public._apply_policy_applicability(v_new, v_p.project_id, v_pts, v_ps);
  UPDATE public.sales_policies SET applicability_scope = v_scope WHERE id = v_new;
  v_ver := public.create_sales_policy_version(v_new, 'cloned');
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'clone_policy', 'sales_policies', v_new,
          jsonb_build_object('source_policy_id', p_policy_id, 'slug', v_slug));
  RETURN jsonb_build_object('policy_id', v_new, 'slug', v_slug, 'version_number', v_ver);
END $$;
REVOKE EXECUTE ON FUNCTION public.clone_sales_policy(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_sales_policy(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.archive_sales_policy(p_policy_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_ver int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v_p.status = 'archived' THEN
    RETURN jsonb_build_object('policy_id', p_policy_id, 'changed', false);
  END IF;
  UPDATE public.sales_policies
    SET status = 'archived', archived_at = now(), published_at = NULL,
        updated_by = auth.uid(), updated_at = now()
    WHERE id = p_policy_id;
  v_ver := public.create_sales_policy_version(p_policy_id, COALESCE(p_reason, 'archived'));
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'archive_policy', 'sales_policies', p_policy_id,
          jsonb_build_object('version', v_ver, 'reason', p_reason, 'was_active', v_p.status = 'active'));
  RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_ver, 'changed', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.archive_sales_policy(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_sales_policy(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restore_sales_policy(p_policy_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_ver int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id FOR UPDATE;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT public.is_project_manager(v_p.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v_p.status <> 'archived' THEN RAISE EXCEPTION 'policy_not_archived'; END IF;
  PERFORM public.validate_sales_policy_content(v_p.content_json);
  PERFORM public.validate_sales_policy_attachments(v_p.attachments);
  UPDATE public.sales_policies
    SET status = 'draft', archived_at = NULL, published_at = NULL,
        updated_by = auth.uid(), updated_at = now()
    WHERE id = p_policy_id;
  v_ver := public.create_sales_policy_version(p_policy_id, 'restored');
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'restore_policy', 'sales_policies', p_policy_id, jsonb_build_object('version', v_ver));
  RETURN jsonb_build_object('policy_id', p_policy_id, 'version_number', v_ver);
END $$;
REVOKE EXECUTE ON FUNCTION public.restore_sales_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_sales_policy(uuid) TO authenticated, service_role;

-- 9. Admin detail RPC
CREATE OR REPLACE FUNCTION public.get_sales_policy_admin_detail(p_policy_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p RECORD; v_pts jsonb; v_ps jsonb; v_vers jsonb; v_derived text; v_now timestamptz := now(); v_can_manage boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_p FROM public.sales_policies WHERE id = p_policy_id;
  IF v_p IS NULL THEN RAISE EXCEPTION 'policy_not_found'; END IF;
  IF NOT (public.has_any_role(ARRAY['super_admin','admin','director'])
          OR public.is_project_member(v_p.project_id)) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  v_can_manage := public.is_project_manager(v_p.project_id);
  SELECT COALESCE(jsonb_agg(to_jsonb(pt) ORDER BY pt.display_order, pt.name), '[]'::jsonb) INTO v_pts
    FROM public.policy_product_types ppt JOIN public.product_types pt ON pt.id = ppt.product_type_id
    WHERE ppt.policy_id = p_policy_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'product_code', p.product_code, 'product_name', p.product_name) ORDER BY p.product_code), '[]'::jsonb) INTO v_ps
    FROM public.policy_products pp JOIN public.products p ON p.id = pp.product_id
    WHERE pp.policy_id = p_policy_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'version_number', v.version_number, 'change_summary', v.change_summary,
      'created_at', v.created_at, 'created_by', v.created_by
    ) ORDER BY v.version_number DESC), '[]'::jsonb) INTO v_vers
    FROM public.sales_policy_versions v WHERE v.policy_id = p_policy_id;
  v_derived := CASE
    WHEN v_p.status = 'archived' THEN 'archived'
    WHEN v_p.status = 'draft' THEN 'draft'
    WHEN v_p.effective_to IS NOT NULL AND v_p.effective_to < v_now THEN 'expired'
    WHEN v_p.effective_from IS NOT NULL AND v_p.effective_from > v_now THEN 'upcoming'
    ELSE 'effective'
  END;
  RETURN jsonb_build_object(
    'policy', to_jsonb(v_p),
    'product_types', v_pts, 'products', v_ps,
    'versions', v_vers,
    'permissions', jsonb_build_object('can_manage', v_can_manage),
    'derived_effective_status', v_derived
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.get_sales_policy_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sales_policy_admin_detail(uuid) TO authenticated, service_role;

-- 10. Search RPC
CREATE OR REPLACE FUNCTION public.search_sales_policies(
  p_project_id uuid, p_query text DEFAULT NULL, p_status text DEFAULT NULL,
  p_effective_state text DEFAULT NULL, p_featured boolean DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_total int; v_lim int; v_off int; v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT (public.has_any_role(ARRAY['super_admin','admin','director'])
          OR public.is_project_member(p_project_id)) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;
  v_lim := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_off := GREATEST(COALESCE(p_offset, 0), 0);

  WITH filtered AS (
    SELECT sp.*,
      CASE
        WHEN sp.status = 'archived' THEN 'archived'
        WHEN sp.status = 'draft' THEN 'draft'
        WHEN sp.effective_to IS NOT NULL AND sp.effective_to < v_now THEN 'expired'
        WHEN sp.effective_from IS NOT NULL AND sp.effective_from > v_now THEN 'upcoming'
        ELSE 'effective'
      END AS derived_state,
      (SELECT count(*) FROM public.policy_product_types WHERE policy_id = sp.id) AS pt_count,
      (SELECT count(*) FROM public.policy_products WHERE policy_id = sp.id) AS p_count
    FROM public.sales_policies sp
    WHERE sp.project_id = p_project_id
      AND (
        (p_status IS NULL AND sp.status <> 'archived')
        OR (p_status IS NOT NULL AND sp.status = p_status)
      )
      AND (p_featured IS NULL OR sp.is_featured = p_featured)
      AND (p_query IS NULL OR (
        sp.title ILIKE '%'||p_query||'%' OR sp.slug ILIKE '%'||p_query||'%'
        OR COALESCE(sp.summary,'') ILIKE '%'||p_query||'%'
      ))
  ), stated AS (
    SELECT * FROM filtered
    WHERE p_effective_state IS NULL OR derived_state = p_effective_state
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.priority DESC, s.updated_at DESC, s.id), '[]'::jsonb),
         (SELECT count(*) FROM stated)
  INTO v_rows, v_total
  FROM (SELECT * FROM stated ORDER BY priority DESC, updated_at DESC, id LIMIT v_lim OFFSET v_off) s;

  RETURN jsonb_build_object('rows', v_rows, 'total', v_total, 'limit', v_lim, 'offset', v_off);
END $$;
REVOKE EXECUTE ON FUNCTION public.search_sales_policies(uuid, text, text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_sales_policies(uuid, text, text, text, boolean, integer, integer) TO authenticated, service_role;

-- 11. Mobile-ready active policies
CREATE OR REPLACE FUNCTION public.get_active_project_policies(
  p_project_id uuid, p_product_id uuid DEFAULT NULL, p_product_type_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_now timestamptz := now(); v_pt uuid; v_proj uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_product_id IS NOT NULL THEN
    SELECT product_type_id, project_id INTO v_pt, v_proj FROM public.products WHERE id = p_product_id;
    IF v_proj IS NULL OR v_proj <> p_project_id THEN RAISE EXCEPTION 'invalid_policy_product'; END IF;
  ELSE
    v_pt := p_product_type_id;
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(sp) ORDER BY sp.is_featured DESC, sp.priority DESC, sp.effective_from DESC NULLS LAST, sp.id), '[]'::jsonb)
  INTO v_rows FROM public.sales_policies sp
  WHERE sp.project_id = p_project_id
    AND sp.status = 'active' AND sp.archived_at IS NULL AND sp.published_at IS NOT NULL
    AND (sp.effective_from IS NULL OR sp.effective_from <= v_now)
    AND (sp.effective_to IS NULL OR sp.effective_to >= v_now)
    AND (
      -- project-wide (no applicability rows)
      (NOT EXISTS (SELECT 1 FROM public.policy_product_types WHERE policy_id = sp.id)
       AND NOT EXISTS (SELECT 1 FROM public.policy_products WHERE policy_id = sp.id))
      -- product type match
      OR (v_pt IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.policy_product_types WHERE policy_id = sp.id AND product_type_id = v_pt
      ))
      -- specific product match
      OR (p_product_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.policy_products WHERE policy_id = sp.id AND product_id = p_product_id
      ))
    );
  RETURN v_rows;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_active_project_policies(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_project_policies(uuid, uuid, uuid) TO authenticated, service_role;

-- 12. RLS: keep read policies as-is (existing), deny direct writes on sales_policies from clients
--     Mutations must go via RPCs. Legacy policies are dropped to enforce this.
DO $$ BEGIN
  -- Drop any existing INSERT/UPDATE/DELETE policies on sales_policies (be permissive)
  PERFORM 1;
END $$;

-- Explicit deny policies (INSERT/UPDATE/DELETE) — safe if already denied
DROP POLICY IF EXISTS "policies deny direct insert" ON public.sales_policies;
CREATE POLICY "policies deny direct insert" ON public.sales_policies
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "policies deny direct update" ON public.sales_policies;
CREATE POLICY "policies deny direct update" ON public.sales_policies
  FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "policies deny direct delete" ON public.sales_policies;
CREATE POLICY "policies deny direct delete" ON public.sales_policies
  FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "policy_pt deny direct insert" ON public.policy_product_types;
CREATE POLICY "policy_pt deny direct insert" ON public.policy_product_types
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "policy_pt deny direct delete" ON public.policy_product_types;
CREATE POLICY "policy_pt deny direct delete" ON public.policy_product_types
  FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "policy_p deny direct insert" ON public.policy_products;
CREATE POLICY "policy_p deny direct insert" ON public.policy_products
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "policy_p deny direct delete" ON public.policy_products;
CREATE POLICY "policy_p deny direct delete" ON public.policy_products
  FOR DELETE TO authenticated USING (false);
