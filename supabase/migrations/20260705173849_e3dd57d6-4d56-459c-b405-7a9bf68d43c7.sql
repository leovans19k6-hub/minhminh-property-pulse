
-- ============================================================================
-- Phase 7C.1 — Mobile Sales Policies RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- search_mobile_policies : cross-project or project-scoped feed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_mobile_policies(
  p_project_id uuid DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
  v_q text := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row, ord), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      jsonb_build_object(
        'id', sp.id,
        'project_id', sp.project_id,
        'project_name', pr.name,
        'project_code', pr.code,
        'title', sp.title,
        'slug', sp.slug,
        'summary', sp.summary,
        'is_featured', sp.is_featured,
        'priority', sp.priority,
        'effective_from', sp.effective_from,
        'effective_to', sp.effective_to,
        'registration_deadline', sp.registration_deadline,
        'published_at', sp.published_at
      ) AS row,
      row_number() OVER (
        ORDER BY sp.is_featured DESC,
                 sp.priority DESC,
                 sp.published_at DESC NULLS LAST,
                 sp.updated_at DESC,
                 sp.id ASC
      ) AS ord
    FROM public.sales_policies sp
    JOIN public.projects pr ON pr.id = sp.project_id
    WHERE sp.status = 'active'
      AND sp.archived_at IS NULL
      AND sp.published_at IS NOT NULL
      AND (sp.effective_from IS NULL OR sp.effective_from <= v_now)
      AND (sp.effective_to IS NULL OR sp.effective_to >= v_now)
      AND (p_project_id IS NULL OR sp.project_id = p_project_id)
      AND (p_featured IS NULL OR sp.is_featured = p_featured)
      AND (
        v_q IS NULL
        OR sp.title ILIKE '%' || v_q || '%'
        OR COALESCE(sp.summary, '') ILIKE '%' || v_q || '%'
      )
      AND (
        p_project_id IS NOT NULL
        OR sp.project_id = ANY (public.accessible_mobile_project_ids())
      )
    ORDER BY sp.is_featured DESC,
             sp.priority DESC,
             sp.published_at DESC NULLS LAST,
             sp.updated_at DESC,
             sp.id ASC
    OFFSET v_offset
    LIMIT v_limit
  ) t;

  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.search_mobile_policies(uuid, text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mobile_policies(uuid, text, boolean, int, int) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- get_mobile_policy_detail : safe single-policy detail
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mobile_policy_detail(
  p_policy_id uuid,
  p_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_policy public.sales_policies%ROWTYPE;
  v_project record;
  v_product_project uuid;
  v_product_type uuid;
  v_applies boolean;
  v_has_pt boolean;
  v_has_p boolean;
  v_result jsonb;
  v_pt_summary jsonb;
  v_p_summary jsonb;
  v_content jsonb;
  v_attachments jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_policy FROM public.sales_policies WHERE id = p_policy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'policy_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_policy.archived_at IS NOT NULL
     OR v_policy.status <> 'active'
     OR v_policy.published_at IS NULL THEN
    RAISE EXCEPTION 'policy_not_available' USING ERRCODE = '42501';
  END IF;

  IF (v_policy.effective_from IS NOT NULL AND v_policy.effective_from > v_now)
     OR (v_policy.effective_to IS NOT NULL AND v_policy.effective_to < v_now) THEN
    RAISE EXCEPTION 'policy_not_effective' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_mobile_project(v_policy.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT project_id, product_type_id
      INTO v_product_project, v_product_type
      FROM public.products WHERE id = p_product_id;
    IF v_product_project IS NULL THEN
      RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_product_project <> v_policy.project_id THEN
      RAISE EXCEPTION 'product_project_mismatch' USING ERRCODE = '22023';
    END IF;
    IF NOT public.can_access_mobile_product(p_product_id) THEN
      RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.policy_product_types WHERE policy_id = v_policy.id)
    INTO v_has_pt;
  SELECT EXISTS (SELECT 1 FROM public.policy_products WHERE policy_id = v_policy.id)
    INTO v_has_p;

  IF p_product_id IS NOT NULL THEN
    v_applies :=
      (NOT v_has_pt AND NOT v_has_p)
      OR EXISTS (SELECT 1 FROM public.policy_product_types
                 WHERE policy_id = v_policy.id AND product_type_id = v_product_type)
      OR EXISTS (SELECT 1 FROM public.policy_products
                 WHERE policy_id = v_policy.id AND product_id = p_product_id);
    IF NOT v_applies THEN
      RAISE EXCEPTION 'policy_not_applicable' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'id', pr.id,
    'code', pr.code,
    'name', pr.name,
    'slug', pr.slug,
    'cover_url', pr.cover_url,
    'location_text', pr.location_text
  )
  INTO v_project
  FROM public.projects pr WHERE pr.id = v_policy.project_id;

  v_content := COALESCE(v_policy.content_json, '{}'::jsonb);
  IF NOT (v_content ? 'sections') THEN
    v_content := jsonb_build_object('sections', '[]'::jsonb);
  END IF;

  v_attachments := COALESCE(v_policy.attachments, '[]'::jsonb);

  IF v_has_pt THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pt.id, 'name', pt.name) ORDER BY pt.name), '[]'::jsonb)
      INTO v_pt_summary
      FROM public.policy_product_types ppt
      JOIN public.product_types pt ON pt.id = ppt.product_type_id
      WHERE ppt.policy_id = v_policy.id;
  ELSE
    v_pt_summary := '[]'::jsonb;
  END IF;

  IF v_has_p THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'product_code', p.product_code,
      'product_name', p.product_name
    ) ORDER BY p.product_code), '[]'::jsonb)
      INTO v_p_summary
      FROM public.policy_products pp
      JOIN public.products p ON p.id = pp.product_id
      WHERE pp.policy_id = v_policy.id;
  ELSE
    v_p_summary := '[]'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'policy', jsonb_build_object(
      'id', v_policy.id,
      'project_id', v_policy.project_id,
      'title', v_policy.title,
      'slug', v_policy.slug,
      'summary', v_policy.summary,
      'effective_from', v_policy.effective_from,
      'effective_to', v_policy.effective_to,
      'registration_deadline', v_policy.registration_deadline,
      'is_featured', v_policy.is_featured,
      'priority', v_policy.priority,
      'published_at', v_policy.published_at,
      'version_number', v_policy.version_number,
      'derived_effective_status',
        CASE
          WHEN v_policy.effective_from IS NOT NULL AND v_policy.effective_from > v_now THEN 'upcoming'
          WHEN v_policy.effective_to IS NOT NULL AND v_policy.effective_to < v_now THEN 'expired'
          ELSE 'effective'
        END
    ),
    'project', to_jsonb(v_project),
    'content_sections', COALESCE(v_content->'sections', '[]'::jsonb),
    'attachments', v_attachments,
    'applicability_summary', jsonb_build_object(
      'scope',
        CASE
          WHEN NOT v_has_pt AND NOT v_has_p THEN 'project_wide'
          WHEN v_has_p AND NOT v_has_pt THEN 'products'
          WHEN v_has_pt AND NOT v_has_p THEN 'product_types'
          ELSE 'mixed'
        END,
      'product_types', v_pt_summary,
      'products', v_p_summary,
      'applies_to_current_product',
        CASE WHEN p_product_id IS NULL THEN NULL ELSE COALESCE(v_applies, true) END
    ),
    'primary_contact', public._resolve_mobile_primary_contact(v_policy.project_id)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_policy_detail(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_policy_detail(uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- get_mobile_project_detail : additively include policies_preview
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mobile_project_detail(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_now timestamptz := now();
BEGIN
  IF NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'project', to_jsonb(p.*) - 'metadata' - 'archived_at',
    'developer', to_jsonb(d.*),
    'inventory_stats', to_jsonb(s.*),
    'zones', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', z.id, 'name', z.name) ORDER BY z.name)
      FROM public.project_zones z WHERE z.project_id = p.id AND z.archived_at IS NULL
    ), '[]'::jsonb),
    'buildings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'zone_id', b.zone_id) ORDER BY b.name)
      FROM public.buildings b WHERE b.project_id = p.id AND b.archived_at IS NULL
    ), '[]'::jsonb),
    'product_types', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) ORDER BY t.name)
      FROM public.product_types t WHERE t.project_id = p.id AND t.archived_at IS NULL
    ), '[]'::jsonb),
    'featured_products', COALESCE((
      SELECT jsonb_agg(row_to_json(f)::jsonb)
      FROM (
        SELECT product_id, product_code, product_name, category, status, primary_price,
               primary_image_url, zone_name, building_name, floor_number, product_type_name,
               land_area, built_up_area, direction, balcony_direction
        FROM public.inventory_product_summary
        WHERE project_id = p.id AND status = 'available'
        ORDER BY featured DESC NULLS LAST, updated_at DESC
        LIMIT 6
      ) f
    ), '[]'::jsonb),
    'policies_preview', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sp.id,
        'title', sp.title,
        'summary', sp.summary,
        'is_featured', sp.is_featured,
        'effective_from', sp.effective_from,
        'effective_to', sp.effective_to,
        'registration_deadline', sp.registration_deadline,
        'priority', sp.priority
      ) ORDER BY sp.is_featured DESC, sp.priority DESC, sp.published_at DESC NULLS LAST, sp.id ASC)
      FROM (
        SELECT sp.*
        FROM public.sales_policies sp
        WHERE sp.project_id = p.id
          AND sp.status = 'active'
          AND sp.archived_at IS NULL
          AND sp.published_at IS NOT NULL
          AND (sp.effective_from IS NULL OR sp.effective_from <= v_now)
          AND (sp.effective_to IS NULL OR sp.effective_to >= v_now)
          AND NOT EXISTS (SELECT 1 FROM public.policy_product_types WHERE policy_id = sp.id)
          AND NOT EXISTS (SELECT 1 FROM public.policy_products WHERE policy_id = sp.id)
        ORDER BY sp.is_featured DESC, sp.priority DESC, sp.published_at DESC NULLS LAST, sp.id ASC
        LIMIT 5
      ) sp
    ), '[]'::jsonb),
    'primary_contact', public._resolve_mobile_primary_contact(p.id)
  )
  INTO v_result
  FROM public.projects p
  LEFT JOIN public.developers d ON d.id = p.developer_id
  LEFT JOIN public.project_inventory_stats s ON s.project_id = p.id
  WHERE p.id = p_project_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;
