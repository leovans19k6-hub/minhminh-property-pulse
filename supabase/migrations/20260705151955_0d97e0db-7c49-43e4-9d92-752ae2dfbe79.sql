
-- Phase 7A — Mobile Sales App read foundation.
-- Server-authoritative accessors for mobile projects + inventory.

-- Access predicate: active user + project not archived + (member OR privileged role).
CREATE OR REPLACE FUNCTION public.can_access_mobile_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_active_user()
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.archived_at IS NULL)
    AND (
      public.has_any_role(ARRAY['super_admin','admin','director']::text[])
      OR EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = p_project_id AND m.user_id = auth.uid())
    )
$$;
REVOKE ALL ON FUNCTION public.can_access_mobile_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_mobile_project(uuid) TO authenticated, service_role;

-- Accessible project IDs for the current caller.
CREATE OR REPLACE FUNCTION public.accessible_mobile_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.projects p
  WHERE p.archived_at IS NULL
    AND public.is_active_user()
    AND (
      public.has_any_role(ARRAY['super_admin','admin','director']::text[])
      OR EXISTS (SELECT 1 FROM public.project_members m WHERE m.project_id = p.id AND m.user_id = auth.uid())
    )
$$;
REVOKE ALL ON FUNCTION public.accessible_mobile_project_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accessible_mobile_project_ids() TO authenticated, service_role;

-- List projects the mobile user can access, ordered deterministically, with inventory stats.
CREATE OR REPLACE FUNCTION public.get_mobile_projects()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.is_featured DESC, x.updated_at DESC, x.id ASC), '[]'::jsonb)
  FROM (
    SELECT
      p.id, p.code, p.slug, p.name, p.short_description,
      p.location_text, p.province, p.district,
      p.thumbnail_url, p.cover_url, p.logo_url,
      p.project_category, p.status, p.is_featured,
      p.updated_at,
      d.id AS developer_id, d.name AS developer_name, d.logo_url AS developer_logo_url,
      s.total_products, s.available_count, s.holding_count, s.booked_count, s.sold_count,
      s.last_inventory_update
    FROM public.projects p
    LEFT JOIN public.developers d ON d.id = p.developer_id
    LEFT JOIN public.project_inventory_stats s ON s.project_id = p.id
    WHERE p.id IN (SELECT public.accessible_mobile_project_ids())
  ) x
$$;
REVOKE ALL ON FUNCTION public.get_mobile_projects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_projects() TO authenticated, service_role;

-- Project detail for mobile: project, developer, zones, buildings, product types, stats, featured products.
CREATE OR REPLACE FUNCTION public.get_mobile_project_detail(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
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
    ), '[]'::jsonb)
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
REVOKE ALL ON FUNCTION public.get_mobile_project_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_project_detail(uuid) TO authenticated, service_role;

-- Mobile inventory search: scoped to accessible projects, paginated with total count.
CREATE OR REPLACE FUNCTION public.search_mobile_inventory(
  p_project_id uuid DEFAULT NULL,
  p_query text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_zone_id uuid DEFAULT NULL,
  p_building_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_floor_min integer DEFAULT NULL,
  p_floor_max integer DEFAULT NULL,
  p_area_min numeric DEFAULT NULL,
  p_area_max numeric DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_direction text DEFAULT NULL,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
  v_q text := NULLIF(TRIM(COALESCE(p_query, '')), '');
  v_total bigint;
  v_items jsonb;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NOT NULL AND NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT s.*
    FROM public.inventory_product_summary s
    WHERE s.project_id IN (SELECT public.accessible_mobile_project_ids())
      AND (p_project_id IS NULL OR s.project_id = p_project_id)
      AND (p_category IS NULL OR s.category = p_category)
      AND (p_zone_id IS NULL OR s.zone_id = p_zone_id)
      AND (p_building_id IS NULL OR s.building_id = p_building_id)
      AND (p_product_type_id IS NULL OR s.product_type_id = p_product_type_id)
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_floor_min IS NULL OR s.floor_number >= p_floor_min)
      AND (p_floor_max IS NULL OR s.floor_number <= p_floor_max)
      AND (p_area_min IS NULL OR COALESCE(s.built_up_area, s.carpet_area, s.construction_area, s.land_area) >= p_area_min)
      AND (p_area_max IS NULL OR COALESCE(s.built_up_area, s.carpet_area, s.construction_area, s.land_area) <= p_area_max)
      AND (p_price_min IS NULL OR s.primary_price >= p_price_min)
      AND (p_price_max IS NULL OR s.primary_price <= p_price_max)
      AND (p_direction IS NULL OR s.direction = p_direction OR s.balcony_direction = p_direction OR s.door_direction = p_direction)
      AND (
        v_q IS NULL
        OR s.product_code ILIKE '%'||v_q||'%'
        OR s.product_name ILIKE '%'||v_q||'%'
        OR s.project_name ILIKE '%'||v_q||'%'
      )
  )
  SELECT
    (SELECT COUNT(*) FROM base),
    COALESCE((
      SELECT jsonb_agg(row_to_json(b)::jsonb)
      FROM (
        SELECT * FROM base
        ORDER BY featured DESC NULLS LAST, updated_at DESC, product_code ASC, product_id ASC
        LIMIT v_limit OFFSET v_offset
      ) b
    ), '[]'::jsonb)
  INTO v_total, v_items;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'has_more', (v_offset + v_limit) < v_total
  );
END;
$$;
REVOKE ALL ON FUNCTION public.search_mobile_inventory(uuid,text,text,uuid,uuid,uuid,text,integer,integer,numeric,numeric,numeric,numeric,text,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mobile_inventory(uuid,text,text,uuid,uuid,uuid,text,integer,integer,numeric,numeric,numeric,numeric,text,integer,integer) TO authenticated, service_role;

-- Filter options scoped to accessible data.
CREATE OR REPLACE FUNCTION public.get_mobile_inventory_filters(p_project_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  IF p_project_id IS NOT NULL AND NOT public.can_access_mobile_project(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  WITH pids AS (
    SELECT id FROM public.projects
    WHERE archived_at IS NULL
      AND id IN (SELECT public.accessible_mobile_project_ids())
      AND (p_project_id IS NULL OR id = p_project_id)
  )
  SELECT jsonb_build_object(
    'projects', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY p.name)
      FROM public.projects p WHERE p.id IN (SELECT id FROM pids)
    ), '[]'::jsonb),
    'zones', COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', z.id, 'name', z.name, 'project_id', z.project_id))
      FROM public.project_zones z WHERE z.project_id IN (SELECT id FROM pids) AND z.archived_at IS NULL
    ), '[]'::jsonb),
    'buildings', COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', b.id, 'name', b.name, 'project_id', b.project_id, 'zone_id', b.zone_id))
      FROM public.buildings b WHERE b.project_id IN (SELECT id FROM pids) AND b.archived_at IS NULL
    ), '[]'::jsonb),
    'product_types', COALESCE((
      SELECT jsonb_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'project_id', t.project_id))
      FROM public.product_types t WHERE t.project_id IN (SELECT id FROM pids) AND t.archived_at IS NULL
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(DISTINCT s.category) FROM public.inventory_product_summary s
      WHERE s.project_id IN (SELECT id FROM pids) AND s.category IS NOT NULL
    ), '[]'::jsonb),
    'statuses', COALESCE((
      SELECT jsonb_agg(DISTINCT s.status) FROM public.inventory_product_summary s
      WHERE s.project_id IN (SELECT id FROM pids) AND s.status IS NOT NULL
    ), '[]'::jsonb),
    'directions', COALESCE((
      SELECT jsonb_agg(DISTINCT d) FROM (
        SELECT unnest(ARRAY[s.direction, s.balcony_direction, s.door_direction]) d
        FROM public.inventory_product_summary s WHERE s.project_id IN (SELECT id FROM pids)
      ) x WHERE d IS NOT NULL
    ), '[]'::jsonb),
    'floor_min', (SELECT MIN(floor_number) FROM public.inventory_product_summary WHERE project_id IN (SELECT id FROM pids)),
    'floor_max', (SELECT MAX(floor_number) FROM public.inventory_product_summary WHERE project_id IN (SELECT id FROM pids)),
    'price_min', (SELECT MIN(primary_price) FROM public.inventory_product_summary WHERE project_id IN (SELECT id FROM pids)),
    'price_max', (SELECT MAX(primary_price) FROM public.inventory_product_summary WHERE project_id IN (SELECT id FROM pids))
  ) INTO v_result;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_mobile_inventory_filters(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_inventory_filters(uuid) TO authenticated, service_role;
