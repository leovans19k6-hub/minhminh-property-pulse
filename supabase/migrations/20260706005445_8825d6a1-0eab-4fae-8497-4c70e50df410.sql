-- ============================================================================
-- Phase 7C.2 — Mobile Vouchers RPCs (additive)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- search_mobile_vouchers : cross-project or project-scoped voucher feed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_mobile_vouchers(
  p_project_id uuid DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_registration_state text DEFAULT NULL,
  p_limit int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
  v_q text := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_rows jsonb;
  v_state_filter text := NULLIF(p_registration_state, '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF v_state_filter IS NOT NULL
     AND v_state_filter NOT IN ('open','upcoming','closed') THEN
    v_state_filter := NULL;
  END IF;

  WITH vs AS (
    SELECT v.*, pr.name AS project_name, pr.code AS project_code,
           public._voucher_registration_count(v.id) AS reg_count,
           public.voucher_derived_state(v.id) AS derived_state
    FROM public.vouchers v
    JOIN public.projects pr ON pr.id = v.project_id
    WHERE v.archived_at IS NULL
      AND v.status = 'active'
      AND v.published_at IS NOT NULL
      AND (p_project_id IS NULL OR v.project_id = p_project_id)
      AND (p_project_id IS NOT NULL OR v.project_id = ANY (public.accessible_mobile_project_ids()))
      AND (p_featured IS NULL OR v.is_featured = p_featured)
      AND (v_q IS NULL
           OR v.title ILIKE '%' || v_q || '%'
           OR COALESCE(v.code, '') ILIKE '%' || v_q || '%'
           OR COALESCE(v.summary, '') ILIKE '%' || v_q || '%')
  ), filtered AS (
    SELECT * FROM vs
    WHERE derived_state NOT IN ('archived','draft','paused','expired')
      AND (
        v_state_filter IS NULL
        OR (v_state_filter = 'open' AND derived_state = 'open')
        OR (v_state_filter = 'upcoming' AND derived_state IN ('upcoming_registration','upcoming_validity'))
        OR (v_state_filter = 'closed' AND derived_state IN ('registration_closed','full'))
      )
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY ord), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', id,
      'project_id', project_id,
      'project_name', project_name,
      'project_code', project_code,
      'title', title,
      'code', code,
      'summary', summary,
      'is_featured', is_featured,
      'priority', priority,
      'derived_state', derived_state,
      'effective_from', effective_from,
      'effective_to', effective_to,
      'registration_start', registration_start,
      'registration_deadline', registration_deadline,
      'quantity', quantity,
      'capacity_used', reg_count,
      'capacity_remaining',
        CASE WHEN quantity IS NULL THEN NULL ELSE greatest(0, quantity - reg_count) END,
      'is_unlimited', quantity IS NULL,
      'per_user_limit', per_user_limit,
      'primary_benefit_summary',
        CASE
          WHEN value_amount IS NOT NULL
            THEN CONCAT('Giảm ', to_char(value_amount, 'FM999G999G999G999'), ' đ')
          WHEN value_percent IS NOT NULL
            THEN CONCAT('Giảm ', value_percent::text, '%')
          WHEN jsonb_typeof(benefits_json) = 'array' AND jsonb_array_length(benefits_json) > 0
            THEN benefits_json->0->>'title'
          ELSE NULL
        END
    ) AS row,
    row_number() OVER (
      ORDER BY is_featured DESC, priority DESC,
               published_at DESC NULLS LAST, updated_at DESC, id ASC
    ) AS ord
    FROM filtered
    ORDER BY is_featured DESC, priority DESC,
             published_at DESC NULLS LAST, updated_at DESC, id ASC
    OFFSET v_offset LIMIT v_limit
  ) t;

  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.search_mobile_vouchers(uuid, text, boolean, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mobile_vouchers(uuid, text, boolean, text, int, int) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- get_mobile_voucher_detail : rich mobile-safe voucher detail
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mobile_voucher_detail(
  p_voucher_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.vouchers%ROWTYPE;
  v_prod public.products%ROWTYPE;
  v_prod_type uuid;
  v_state text;
  v_count int;
  v_elig jsonb;
  v_regs jsonb;
  v_user_active int;
  v_user_total int;
  v_can_cancel_id uuid;
  v_pt jsonb;
  v_p_summary jsonb;
  v_pol jsonb;
  v_has_pt boolean;
  v_has_p boolean;
  v_has_pol boolean;
  v_applies boolean;
  v_applies_policy boolean;
  v_scope text;
  v_can_register boolean;
  v_can_cancel boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v.id IS NULL THEN
    RAISE EXCEPTION 'voucher_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_mobile_project(v.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF v.archived_at IS NOT NULL
     OR v.status IN ('archived','draft')
     OR v.published_at IS NULL THEN
    RAISE EXCEPTION 'voucher_not_available' USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_prod FROM public.products WHERE id = p_product_id;
    IF v_prod.id IS NULL THEN
      RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_prod.project_id <> v.project_id THEN
      RAISE EXCEPTION 'voucher_product_project_mismatch' USING ERRCODE = '22023';
    END IF;
    IF NOT public.can_access_mobile_product(p_product_id) THEN
      RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
    END IF;
    v_prod_type := v_prod.product_type_id;
  END IF;

  IF p_policy_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sales_policies sp
      WHERE sp.id = p_policy_id AND sp.project_id = v.project_id
    ) THEN
      RAISE EXCEPTION 'voucher_policy_project_mismatch' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_count := public._voucher_registration_count(p_voucher_id);
  v_state := public.voucher_derived_state(p_voucher_id);
  v_elig  := public.check_voucher_eligibility(p_voucher_id, p_product_id, v_prod_type, p_policy_id);

  SELECT count(*) FILTER (WHERE status IN ('new','in_progress','confirmed','completed')),
         count(*)
    INTO v_user_active, v_user_total
    FROM public.registrations
   WHERE voucher_id = p_voucher_id
     AND registration_type = 'voucher'
     AND created_by = auth.uid();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'registration_code', r.registration_code,
           'status', r.status,
           'created_at', r.created_at,
           'can_cancel', r.status IN ('new','in_progress')
         ) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_regs
    FROM public.registrations r
   WHERE r.voucher_id = p_voucher_id
     AND r.registration_type = 'voucher'
     AND r.created_by = auth.uid();

  SELECT id INTO v_can_cancel_id
    FROM public.registrations
   WHERE voucher_id = p_voucher_id
     AND registration_type = 'voucher'
     AND created_by = auth.uid()
     AND status IN ('new','in_progress')
   ORDER BY created_at DESC
   LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM public.voucher_product_types WHERE voucher_id = v.id),
         EXISTS (SELECT 1 FROM public.voucher_products      WHERE voucher_id = v.id),
         EXISTS (SELECT 1 FROM public.voucher_sales_policies WHERE voucher_id = v.id)
    INTO v_has_pt, v_has_p, v_has_pol;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pt.id, 'name', pt.name) ORDER BY pt.name), '[]'::jsonb)
    INTO v_pt
    FROM public.voucher_product_types vpt
    JOIN public.product_types pt ON pt.id = vpt.product_type_id
   WHERE vpt.voucher_id = v.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', pp.id,
           'product_code', pp.product_code,
           'product_name', pp.product_name
         ) ORDER BY pp.product_code), '[]'::jsonb)
    INTO v_p_summary
    FROM public.voucher_products vp
    JOIN public.products pp ON pp.id = vp.product_id
   WHERE vp.voucher_id = v.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', sp.id, 'title', sp.title) ORDER BY sp.title), '[]'::jsonb)
    INTO v_pol
    FROM public.voucher_sales_policies vsp
    JOIN public.sales_policies sp ON sp.id = vsp.policy_id
   WHERE vsp.voucher_id = v.id;

  v_scope := CASE
    WHEN v.applicability_scope = 'project_wide'
      OR (NOT v_has_pt AND NOT v_has_p AND NOT v_has_pol)
    THEN 'project_wide'
    ELSE v.applicability_scope::text
  END;

  IF p_product_id IS NULL THEN
    v_applies := NULL;
  ELSE
    v_applies := (v_scope = 'project_wide')
      OR EXISTS (SELECT 1 FROM public.voucher_products WHERE voucher_id = v.id AND product_id = p_product_id)
      OR (v_prod_type IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.voucher_product_types
            WHERE voucher_id = v.id AND product_type_id = v_prod_type));
  END IF;

  IF p_policy_id IS NULL THEN
    v_applies_policy := NULL;
  ELSE
    v_applies_policy := (v_scope = 'project_wide')
      OR EXISTS (SELECT 1 FROM public.voucher_sales_policies WHERE voucher_id = v.id AND policy_id = p_policy_id);
  END IF;

  v_can_register := COALESCE((v_elig->>'eligible')::boolean, false);
  v_can_cancel   := v_can_cancel_id IS NOT NULL;

  RETURN jsonb_build_object(
    'voucher', jsonb_build_object(
      'id', v.id,
      'project_id', v.project_id,
      'title', v.title,
      'slug', v.slug,
      'code', v.code,
      'summary', v.summary,
      'is_featured', v.is_featured,
      'priority', v.priority,
      'derived_state', v_state,
      'effective_from', v.effective_from,
      'effective_to', v.effective_to,
      'registration_start', v.registration_start,
      'registration_deadline', v.registration_deadline,
      'quantity', v.quantity,
      'capacity_used', v_count,
      'capacity_remaining',
        CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - v_count) END,
      'is_unlimited', v.quantity IS NULL,
      'per_user_limit', v.per_user_limit,
      'published_at', v.published_at,
      'value_amount', v.value_amount,
      'value_percent', v.value_percent
    ),
    'project', (SELECT jsonb_build_object(
                  'id', p.id, 'code', p.code, 'name', p.name, 'cover_url', p.cover_url)
                FROM public.projects p WHERE p.id = v.project_id),
    'benefits',    COALESCE(v.benefits_json, '[]'::jsonb),
    'conditions',  COALESCE(v.conditions_json, '[]'::jsonb),
    'attachments', COALESCE(v.attachments, '[]'::jsonb),
    'applicability_summary', jsonb_build_object(
      'scope', v_scope,
      'product_types', v_pt,
      'products', v_p_summary,
      'policies', v_pol,
      'applies_to_current_product', v_applies,
      'applies_to_current_policy', v_applies_policy
    ),
    'eligibility', v_elig,
    'my_registration_state', jsonb_build_object(
      'active_registration_count', v_user_active,
      'total_registration_count', v_user_total,
      'per_user_limit', v.per_user_limit,
      'remaining_user_quota', greatest(0, v.per_user_limit - v_user_active),
      'registrations', v_regs,
      'latest_registration_id',
        (SELECT id FROM public.registrations
          WHERE voucher_id = p_voucher_id AND registration_type='voucher'
            AND created_by = auth.uid()
          ORDER BY created_at DESC LIMIT 1),
      'latest_registration_status',
        (SELECT status FROM public.registrations
          WHERE voucher_id = p_voucher_id AND registration_type='voucher'
            AND created_by = auth.uid()
          ORDER BY created_at DESC LIMIT 1),
      'can_register', v_can_register,
      'can_cancel', v_can_cancel,
      'cancellation_registration_id', v_can_cancel_id
    ),
    'primary_contact', public._resolve_mobile_primary_contact(v.project_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_voucher_detail(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_voucher_detail(uuid, uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Extend get_mobile_project_detail : add vouchers_preview (project-wide, max 5)
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
    'vouchers_preview', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', vv.id,
        'title', vv.title,
        'code', vv.code,
        'summary', vv.summary,
        'is_featured', vv.is_featured,
        'derived_state', public.voucher_derived_state(vv.id),
        'registration_deadline', vv.registration_deadline,
        'quantity', vv.quantity,
        'capacity_remaining',
          CASE WHEN vv.quantity IS NULL THEN NULL
               ELSE greatest(0, vv.quantity - public._voucher_registration_count(vv.id)) END,
        'is_unlimited', vv.quantity IS NULL,
        'primary_benefit_summary',
          CASE
            WHEN vv.value_amount IS NOT NULL
              THEN CONCAT('Giảm ', to_char(vv.value_amount, 'FM999G999G999G999'), ' đ')
            WHEN vv.value_percent IS NOT NULL
              THEN CONCAT('Giảm ', vv.value_percent::text, '%')
            WHEN jsonb_typeof(vv.benefits_json) = 'array' AND jsonb_array_length(vv.benefits_json) > 0
              THEN vv.benefits_json->0->>'title'
            ELSE NULL
          END,
        'priority', vv.priority
      ) ORDER BY vv.is_featured DESC, vv.priority DESC, vv.published_at DESC NULLS LAST, vv.id ASC)
      FROM (
        SELECT v.*
        FROM public.vouchers v
        WHERE v.project_id = p.id
          AND v.archived_at IS NULL
          AND v.status = 'active'
          AND v.published_at IS NOT NULL
          AND (v.applicability_scope = 'project_wide'
               OR (NOT EXISTS (SELECT 1 FROM public.voucher_product_types WHERE voucher_id = v.id)
                   AND NOT EXISTS (SELECT 1 FROM public.voucher_products WHERE voucher_id = v.id)
                   AND NOT EXISTS (SELECT 1 FROM public.voucher_sales_policies WHERE voucher_id = v.id)))
          AND public.voucher_derived_state(v.id) NOT IN ('archived','draft','paused','expired')
        ORDER BY v.is_featured DESC, v.priority DESC, v.published_at DESC NULLS LAST, v.id ASC
        LIMIT 5
      ) vv
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
