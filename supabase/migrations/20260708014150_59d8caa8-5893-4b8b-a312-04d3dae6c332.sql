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
  v_uid uuid := auth.uid();
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
  v_q text := NULLIF(btrim(COALESCE(p_query, '')), '');
  v_type text := NULLIF(btrim(COALESCE(p_event_type, '')), '');
  v_state text := NULLIF(btrim(COALESCE(p_derived_state, '')), '');
  v_result jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied';
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
      AND (p_project_id IS NOT NULL OR e.project_id IN (SELECT public.accessible_mobile_project_ids()))
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
  INTO v_result
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
            AND r.created_by = v_uid
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

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.search_mobile_events(uuid, text, text, boolean, text, timestamptz, timestamptz, uuid, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mobile_events(uuid, text, text, boolean, text, timestamptz, timestamptz, uuid, int, int) TO authenticated, service_role;