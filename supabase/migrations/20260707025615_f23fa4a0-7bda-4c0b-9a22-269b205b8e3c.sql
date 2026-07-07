-- ============================================================================
-- Phase 7C.3 — Mobile Events RPCs (additive)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- search_mobile_events : cross-project or project-scoped upcoming event feed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_mobile_events(
  p_project_id uuid DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_event_type text DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_derived_state text DEFAULT NULL,
  p_starts_from timestamptz DEFAULT NULL,
  p_starts_to timestamptz DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
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
  v_state text := NULLIF(btrim(COALESCE(p_derived_state, '')), '');
  v_type text := NULLIF(btrim(COALESCE(p_event_type, '')), '');
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF p_project_id IS NOT NULL AND NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF v_state IS NOT NULL AND v_state NOT IN
    ('upcoming_registration','registration_open','upcoming','ongoing',
     'full','registration_closed','completed') THEN
    v_state := NULL;
  END IF;

  WITH es AS (
    SELECT e.*, pr.name AS project_name, pr.code AS project_code,
           public._event_registration_count(e.id) AS reg_count,
           public.event_derived_state(e.id)         AS derived_state
    FROM public.events e
    JOIN public.projects pr ON pr.id = e.project_id
    WHERE e.archived_at IS NULL
      AND e.status = 'active'
      AND e.published_at IS NOT NULL
      AND (p_project_id IS NULL OR e.project_id = p_project_id)
      AND (p_project_id IS NOT NULL OR e.project_id = ANY (public.accessible_mobile_project_ids()))
      AND (v_type IS NULL OR e.event_type = v_type)
      AND (p_featured IS NULL OR e.is_featured = p_featured)
      AND (p_starts_from IS NULL OR e.start_at IS NULL OR e.start_at >= p_starts_from)
      AND (p_starts_to   IS NULL OR e.start_at IS NULL OR e.start_at <= p_starts_to)
      AND (v_q IS NULL
           OR e.title ILIKE '%' || v_q || '%'
           OR COALESCE(e.summary, '') ILIKE '%' || v_q || '%'
           OR COALESCE(e.location_name, '') ILIKE '%' || v_q || '%')
  ), filtered AS (
    SELECT *
    FROM es
    WHERE derived_state NOT IN ('archived','draft','paused','cancelled')
      AND (v_state IS NULL OR derived_state = v_state)
      AND (
        p_product_id IS NULL
        OR applicability_scope = 'project_wide'
        OR EXISTS (SELECT 1 FROM public.event_products ep WHERE ep.event_id = es.id AND ep.product_id = p_product_id)
        OR EXISTS (
          SELECT 1 FROM public.event_product_types ept
          JOIN public.products pp ON pp.product_type_id = ept.product_type_id
          WHERE ept.event_id = es.id AND pp.id = p_product_id
        )
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
      'slug', slug,
      'event_type', event_type,
      'summary', summary,
      'start_at', start_at,
      'end_at', end_at,
      'timezone', timezone,
      'location_type', location_type,
      'location_name', location_name,
      'address_text', address_text,
      'meeting_url', meeting_url,
      'thumbnail_url', thumbnail_url,
      'is_featured', is_featured,
      'priority', priority,
      'derived_state', derived_state,
      'registration_start', registration_start,
      'registration_deadline', registration_deadline,
      'capacity', capacity,
      'registration_count', reg_count,
      'remaining',
        CASE WHEN capacity IS NULL THEN NULL
             ELSE greatest(0, capacity - reg_count) END,
      'is_unlimited', capacity IS NULL,
      'per_user_limit', per_user_limit,
      'user_registration_count',
        (SELECT count(*) FROM public.registrations r
          WHERE r.event_id = filtered.id
            AND r.registration_type IN ('event','site_tour')
            AND r.created_by = auth.uid()
            AND r.status IN ('new','in_progress','confirmed','completed'))
    ) AS row,
    row_number() OVER (
      ORDER BY is_featured DESC,
               start_at ASC NULLS LAST,
               priority DESC,
               id ASC
    ) AS ord
    FROM filtered
    ORDER BY is_featured DESC, start_at ASC NULLS LAST, priority DESC, id ASC
    OFFSET v_offset LIMIT v_limit
  ) t;

  RETURN jsonb_build_object('rows', v_rows);
END;
$$;

REVOKE ALL ON FUNCTION public.search_mobile_events(uuid, text, text, boolean, text, timestamptz, timestamptz, uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mobile_events(uuid, text, text, boolean, text, timestamptz, timestamptz, uuid, int, int) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- get_mobile_event_detail : rich mobile-safe event detail
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_mobile_event_detail(
  p_event_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_voucher_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.events%ROWTYPE;
  v_prod public.products%ROWTYPE;
  v_prod_type uuid;
  v_state text;
  v_count int;
  v_elig jsonb;
  v_regs jsonb;
  v_sessions jsonb;
  v_user_active int;
  v_user_total int;
  v_can_cancel_id uuid;
  v_pt jsonb;
  v_p_summary jsonb;
  v_pol jsonb;
  v_vo jsonb;
  v_has_pt boolean;
  v_has_p boolean;
  v_has_pol boolean;
  v_has_vo boolean;
  v_scope text;
  v_applies boolean;
  v_applies_policy boolean;
  v_can_register boolean;
  v_can_cancel boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO e FROM public.events WHERE id = p_event_id;
  IF e.id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_mobile_project(e.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  IF e.archived_at IS NOT NULL
     OR e.status IN ('archived','draft')
     OR e.published_at IS NULL THEN
    RAISE EXCEPTION 'event_not_active' USING ERRCODE = '42501';
  END IF;

  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_prod FROM public.products WHERE id = p_product_id;
    IF v_prod.id IS NULL THEN
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
    END IF;
    IF v_prod.project_id <> e.project_id THEN
      RAISE EXCEPTION 'event_not_applicable' USING ERRCODE = '22023';
    END IF;
    v_prod_type := COALESCE(p_product_type_id, v_prod.product_type_id);
  ELSE
    v_prod_type := p_product_type_id;
  END IF;

  IF p_policy_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sales_policies sp
      WHERE sp.id = p_policy_id AND sp.project_id = e.project_id
    ) THEN
      RAISE EXCEPTION 'invalid_event_policy' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_voucher_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vouchers vv
      WHERE vv.id = p_voucher_id AND vv.project_id = e.project_id
    ) THEN
      RAISE EXCEPTION 'invalid_event_voucher' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_count := public._event_registration_count(p_event_id);
  v_state := public.event_derived_state(p_event_id);
  v_elig  := public.check_event_eligibility(p_event_id, p_product_id, v_prod_type, p_policy_id, p_voucher_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'title', s.title,
           'description', s.description,
           'starts_at', s.starts_at,
           'ends_at', s.ends_at,
           'location_text', s.location_text,
           'display_order', s.display_order
         ) ORDER BY s.starts_at, s.display_order, s.id), '[]'::jsonb)
    INTO v_sessions
    FROM public.event_sessions s
   WHERE s.event_id = p_event_id;

  SELECT count(*) FILTER (WHERE status IN ('new','in_progress','confirmed','completed')),
         count(*)
    INTO v_user_active, v_user_total
    FROM public.registrations
   WHERE event_id = p_event_id
     AND registration_type IN ('event','site_tour')
     AND created_by = auth.uid();

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', r.id,
           'registration_code', r.registration_code,
           'status', r.status,
           'created_at', r.created_at,
           'can_cancel', r.status IN ('new','in_progress')
             AND (e.start_at IS NULL OR e.start_at > now())
             AND e.status NOT IN ('completed','archived')
         ) ORDER BY r.created_at DESC), '[]'::jsonb)
    INTO v_regs
    FROM public.registrations r
   WHERE r.event_id = p_event_id
     AND r.registration_type IN ('event','site_tour')
     AND r.created_by = auth.uid();

  SELECT id INTO v_can_cancel_id
    FROM public.registrations
   WHERE event_id = p_event_id
     AND registration_type IN ('event','site_tour')
     AND created_by = auth.uid()
     AND status IN ('new','in_progress')
   ORDER BY created_at DESC
   LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM public.event_product_types    WHERE event_id = e.id),
         EXISTS (SELECT 1 FROM public.event_products         WHERE event_id = e.id),
         EXISTS (SELECT 1 FROM public.event_sales_policies   WHERE event_id = e.id),
         EXISTS (SELECT 1 FROM public.event_vouchers         WHERE event_id = e.id)
    INTO v_has_pt, v_has_p, v_has_pol, v_has_vo;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pt.id, 'name', pt.name) ORDER BY pt.name), '[]'::jsonb)
    INTO v_pt
    FROM public.event_product_types x
    JOIN public.product_types pt ON pt.id = x.product_type_id
   WHERE x.event_id = e.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', pp.id,
           'product_code', pp.product_code,
           'product_name', pp.product_name
         ) ORDER BY pp.product_code), '[]'::jsonb)
    INTO v_p_summary
    FROM public.event_products x
    JOIN public.products pp ON pp.id = x.product_id
   WHERE x.event_id = e.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', sp.id, 'title', sp.title) ORDER BY sp.title), '[]'::jsonb)
    INTO v_pol
    FROM public.event_sales_policies x
    JOIN public.sales_policies sp ON sp.id = x.policy_id
   WHERE x.event_id = e.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', vv.id, 'title', vv.title, 'code', vv.code) ORDER BY vv.title), '[]'::jsonb)
    INTO v_vo
    FROM public.event_vouchers x
    JOIN public.vouchers vv ON vv.id = x.voucher_id
   WHERE x.event_id = e.id;

  v_scope := CASE
    WHEN e.applicability_scope = 'project_wide'
      OR (NOT v_has_pt AND NOT v_has_p AND NOT v_has_pol AND NOT v_has_vo)
    THEN 'project_wide'
    ELSE e.applicability_scope::text
  END;

  IF p_product_id IS NULL THEN
    v_applies := NULL;
  ELSE
    v_applies := (v_scope = 'project_wide')
      OR EXISTS (SELECT 1 FROM public.event_products WHERE event_id = e.id AND product_id = p_product_id)
      OR (v_prod_type IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.event_product_types
            WHERE event_id = e.id AND product_type_id = v_prod_type));
  END IF;

  IF p_policy_id IS NULL THEN
    v_applies_policy := NULL;
  ELSE
    v_applies_policy := (v_scope = 'project_wide')
      OR EXISTS (SELECT 1 FROM public.event_sales_policies WHERE event_id = e.id AND policy_id = p_policy_id);
  END IF;

  v_can_register := COALESCE((v_elig->>'eligible')::boolean, false);
  v_can_cancel   := v_can_cancel_id IS NOT NULL;

  RETURN jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id,
      'project_id', e.project_id,
      'title', e.title,
      'slug', e.slug,
      'event_type', e.event_type,
      'summary', e.summary,
      'content', e.content,
      'start_at', e.start_at,
      'end_at', e.end_at,
      'timezone', e.timezone,
      'registration_start', e.registration_start,
      'registration_deadline', e.registration_deadline,
      'location_type', e.location_type,
      'location_name', e.location_name,
      'address_text', e.address_text,
      'meeting_url', e.meeting_url,
      'latitude', e.latitude,
      'longitude', e.longitude,
      'location_notes', e.location_notes,
      'thumbnail_url', e.thumbnail_url,
      'contact_phone', e.contact_phone,
      'is_featured', e.is_featured,
      'priority', e.priority,
      'capacity', e.capacity,
      'per_user_limit', e.per_user_limit,
      'derived_state', v_state,
      'published_at', e.published_at,
      'agenda', COALESCE(e.agenda_json, '[]'::jsonb),
      'speakers', COALESCE(e.speakers_json, '[]'::jsonb),
      'attachments', COALESCE(e.attachments, '[]'::jsonb),
      'site_tour_details', CASE WHEN e.event_type = 'site_tour'
                                 THEN COALESCE(e.site_tour_details, '{}'::jsonb)
                                 ELSE '{}'::jsonb END,
      'is_unlimited', e.capacity IS NULL,
      'capacity_remaining',
        CASE WHEN e.capacity IS NULL THEN NULL
             ELSE greatest(0, e.capacity - v_count) END,
      'capacity_used', v_count
    ),
    'project', (SELECT jsonb_build_object(
                  'id', p.id, 'code', p.code, 'name', p.name, 'cover_url', p.cover_url)
                FROM public.projects p WHERE p.id = e.project_id),
    'sessions', v_sessions,
    'capacity_stats', jsonb_build_object(
      'capacity', e.capacity,
      'registration_count', v_count,
      'remaining', CASE WHEN e.capacity IS NULL THEN NULL
                        ELSE greatest(0, e.capacity - v_count) END
    ),
    'applicability_summary', jsonb_build_object(
      'scope', v_scope,
      'product_types', v_pt,
      'products', v_p_summary,
      'policies', v_pol,
      'vouchers', v_vo,
      'applies_to_current_product', v_applies,
      'applies_to_current_policy', v_applies_policy
    ),
    'eligibility', v_elig,
    'my_registration_state', jsonb_build_object(
      'active_registration_count', v_user_active,
      'total_registration_count', v_user_total,
      'per_user_limit', e.per_user_limit,
      'remaining_user_quota', greatest(0, e.per_user_limit - v_user_active),
      'registrations', v_regs,
      'latest_registration_id',
        (SELECT id FROM public.registrations
          WHERE event_id = p_event_id
            AND registration_type IN ('event','site_tour')
            AND created_by = auth.uid()
          ORDER BY created_at DESC LIMIT 1),
      'latest_registration_status',
        (SELECT status FROM public.registrations
          WHERE event_id = p_event_id
            AND registration_type IN ('event','site_tour')
            AND created_by = auth.uid()
          ORDER BY created_at DESC LIMIT 1),
      'can_register', v_can_register,
      'can_cancel', v_can_cancel,
      'cancellation_registration_id', v_can_cancel_id
    ),
    'primary_contact', public._resolve_mobile_primary_contact(e.project_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_mobile_event_detail(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_event_detail(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Extend get_mobile_project_detail : add events_preview (project-wide, max 5)
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
        'id', sp.id, 'title', sp.title, 'summary', sp.summary,
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
        'id', vv.id, 'title', vv.title, 'code', vv.code, 'summary', vv.summary,
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
    'events_preview', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ee.id,
        'title', ee.title,
        'slug', ee.slug,
        'event_type', ee.event_type,
        'summary', ee.summary,
        'start_at', ee.start_at,
        'end_at', ee.end_at,
        'timezone', ee.timezone,
        'location_type', ee.location_type,
        'location_name', ee.location_name,
        'thumbnail_url', ee.thumbnail_url,
        'is_featured', ee.is_featured,
        'priority', ee.priority,
        'derived_state', public.event_derived_state(ee.id),
        'registration_deadline', ee.registration_deadline,
        'capacity', ee.capacity,
        'capacity_remaining',
          CASE WHEN ee.capacity IS NULL THEN NULL
               ELSE greatest(0, ee.capacity - public._event_registration_count(ee.id)) END,
        'is_unlimited', ee.capacity IS NULL
      ) ORDER BY ee.is_featured DESC, ee.start_at ASC NULLS LAST, ee.priority DESC, ee.id ASC)
      FROM (
        SELECT e.*
        FROM public.events e
        WHERE e.project_id = p.id
          AND e.archived_at IS NULL
          AND e.status = 'active'
          AND e.published_at IS NOT NULL
          AND (e.applicability_scope = 'project_wide'
               OR (NOT EXISTS (SELECT 1 FROM public.event_product_types WHERE event_id = e.id)
                   AND NOT EXISTS (SELECT 1 FROM public.event_products WHERE event_id = e.id)
                   AND NOT EXISTS (SELECT 1 FROM public.event_sales_policies WHERE event_id = e.id)
                   AND NOT EXISTS (SELECT 1 FROM public.event_vouchers WHERE event_id = e.id)))
          AND public.event_derived_state(e.id) NOT IN ('archived','draft','paused','cancelled','completed')
        ORDER BY e.is_featured DESC, e.start_at ASC NULLS LAST, e.priority DESC, e.id ASC
        LIMIT 5
      ) ee
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
