-- ============================================================================
-- Phase 7C.4 — Mobile My Registrations (additive, read-only)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- search_my_mobile_registrations
--   Unified list of the CALLER'S OWN registrations (created_by = auth.uid()).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_my_mobile_registrations(
  p_project_id uuid DEFAULT NULL,
  p_domain text DEFAULT NULL,               -- CONSULTATION|VOUCHER|EVENT|OTHER
  p_registration_type text DEFAULT NULL,    -- consultation|voucher|event|site_tour
  p_status text DEFAULT NULL,
  p_query text DEFAULT NULL,
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
  v_domain text := NULLIF(upper(btrim(COALESCE(p_domain, ''))), '');
  v_type text := NULLIF(lower(btrim(COALESCE(p_registration_type, ''))), '');
  v_status text := NULLIF(lower(btrim(COALESCE(p_status, ''))), '');
  v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(row_obj ORDER BY (row_obj->>'created_at') DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', r.id,
      'registration_code', r.registration_code,
      'registration_type', r.registration_type,
      'domain', public.get_registration_domain(r.registration_type),
      'status', r.status,
      'created_at', r.created_at,
      'updated_at', r.updated_at,
      'project', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', p.id, 'name', p.name, 'code', p.code, 'cover_url', p.cover_url
      ) END,
      'voucher', CASE WHEN v.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', v.id, 'title', v.title, 'code', v.code
      ) END,
      'event', CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', e.id, 'title', e.title, 'event_type', e.event_type,
        'start_at', e.start_at, 'end_at', e.end_at
      ) END,
      'product', CASE WHEN pr.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', pr.id, 'product_code', pr.product_code, 'product_name', pr.product_name
      ) END,
      'can_cancel', CASE
        WHEN r.registration_type = 'voucher' THEN r.status IN ('new','in_progress')
        WHEN r.registration_type IN ('event','site_tour') THEN
          r.status IN ('new','in_progress')
          AND COALESCE(e.status,'') NOT IN ('completed','cancelled','archived')
          AND (e.start_at IS NULL OR e.start_at > now())
        ELSE false
      END,
      'cancel_method', CASE
        WHEN r.registration_type = 'voucher' THEN 'voucher'
        WHEN r.registration_type IN ('event','site_tour') THEN 'event'
        ELSE NULL
      END
    ) AS row_obj
    FROM public.registrations r
    LEFT JOIN public.projects p ON p.id = r.project_id
    LEFT JOIN public.vouchers v ON v.id = r.voucher_id
    LEFT JOIN public.events e ON e.id = r.event_id
    LEFT JOIN public.products pr ON pr.id = r.product_id
    WHERE r.created_by = auth.uid()
      AND (p_project_id IS NULL OR r.project_id = p_project_id)
      AND (v_type IS NULL OR r.registration_type = v_type)
      AND (v_status IS NULL OR r.status = v_status)
      AND (v_domain IS NULL OR public.get_registration_domain(r.registration_type) = v_domain)
      AND (
        v_q IS NULL
        OR r.registration_code ILIKE '%' || v_q || '%'
        OR COALESCE(p.name, '') ILIKE '%' || v_q || '%'
        OR COALESCE(v.title, '') ILIKE '%' || v_q || '%'
        OR COALESCE(e.title, '') ILIKE '%' || v_q || '%'
        OR COALESCE(pr.product_name, '') ILIKE '%' || v_q || '%'
        OR COALESCE(pr.product_code, '') ILIKE '%' || v_q || '%'
      )
    ORDER BY r.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) s;

  RETURN jsonb_build_object('rows', v_rows);
END $$;

REVOKE ALL ON FUNCTION public.search_my_mobile_registrations(uuid,text,text,text,text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_my_mobile_registrations(uuid,text,text,text,text,int,int) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- get_my_mobile_registration_detail
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_mobile_registration_detail(p_registration_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.registrations;
  v_project jsonb;
  v_voucher jsonb;
  v_event jsonb;
  v_product jsonb;
  v_contact jsonb;
  v_activity jsonb;
  v_can_cancel boolean;
  v_cancel_method text;
  v_domain text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'registration_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF r.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  v_domain := public.get_registration_domain(r.registration_type);

  SELECT jsonb_build_object(
    'id', p.id, 'name', p.name, 'code', p.code,
    'cover_url', p.cover_url, 'address_full', p.address_full
  ) INTO v_project
  FROM public.projects p WHERE p.id = r.project_id;

  IF r.voucher_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', v.id, 'title', v.title, 'code', v.code,
      'summary', v.summary, 'thumbnail_url', v.thumbnail_url,
      'valid_from', v.valid_from, 'valid_to', v.valid_to,
      'archived_at', v.archived_at
    ) INTO v_voucher FROM public.vouchers v WHERE v.id = r.voucher_id;
  END IF;

  IF r.event_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', e.id, 'title', e.title, 'event_type', e.event_type,
      'summary', e.summary, 'thumbnail_url', e.thumbnail_url,
      'start_at', e.start_at, 'end_at', e.end_at, 'timezone', e.timezone,
      'location_type', e.location_type, 'location_name', e.location_name,
      'address_text', e.address_text, 'meeting_url', e.meeting_url,
      'status', e.status, 'archived_at', e.archived_at
    ) INTO v_event FROM public.events e WHERE e.id = r.event_id;
  END IF;

  IF r.product_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', pr.id, 'product_code', pr.product_code, 'product_name', pr.product_name
    ) INTO v_product FROM public.products pr WHERE pr.id = r.product_id;
  END IF;

  IF r.project_id IS NOT NULL THEN
    v_contact := public._resolve_mobile_primary_contact(r.project_id);
  END IF;

  -- Safe activity summary: only status_change / system / registration_review
  -- Content field is deliberately omitted to avoid ops-internal notes leaking.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'activity_type', a.activity_type,
    'title', a.title,
    'occurred_at', a.occurred_at
  ) ORDER BY a.occurred_at DESC), '[]'::jsonb)
  INTO v_activity
  FROM public.crm_activities a
  WHERE a.registration_id = r.id
    AND a.activity_type IN ('status_change','system','registration_review')
  LIMIT 50;

  -- Capabilities — mobile only cancels via canonical voucher/event flows.
  IF r.registration_type = 'voucher' THEN
    v_cancel_method := 'voucher';
    v_can_cancel := r.status IN ('new','in_progress');
  ELSIF r.registration_type IN ('event','site_tour') THEN
    v_cancel_method := 'event';
    v_can_cancel := r.status IN ('new','in_progress')
      AND COALESCE((v_event->>'status'), '') NOT IN ('completed','cancelled','archived')
      AND ((v_event->>'start_at') IS NULL OR (v_event->>'start_at')::timestamptz > now());
  ELSE
    v_cancel_method := NULL;
    v_can_cancel := false;
  END IF;

  RETURN jsonb_build_object(
    'registration', jsonb_build_object(
      'id', r.id,
      'registration_code', r.registration_code,
      'registration_type', r.registration_type,
      'domain', v_domain,
      'status', r.status,
      'note', r.note,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    ),
    'project', v_project,
    'voucher', v_voucher,
    'event', v_event,
    'product', v_product,
    'primary_contact', v_contact,
    'activities', v_activity,
    'capabilities', jsonb_build_object(
      'can_cancel', COALESCE(v_can_cancel, false),
      'cancel_method', v_cancel_method
    )
  );
END $$;

REVOKE ALL ON FUNCTION public.get_my_mobile_registration_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_mobile_registration_detail(uuid) TO authenticated, service_role;