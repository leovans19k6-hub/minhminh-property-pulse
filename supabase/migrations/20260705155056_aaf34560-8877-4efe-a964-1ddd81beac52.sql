
-- Phase 7B: Mobile product detail + favorites RPCs

-- ============ Access predicate for a single product ============
CREATE OR REPLACE FUNCTION public.can_access_mobile_product(p_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.products p
     WHERE p.id = p_product_id
       AND p.archived_at IS NULL
       AND public.can_access_mobile_project(p.project_id)
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_mobile_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_mobile_product(uuid) TO authenticated, service_role;

-- ============ Primary contact resolver (internal) ============
CREATE OR REPLACE FUNCTION public._resolve_mobile_primary_contact(p_project_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id',    pr.id,
    'full_name',  pr.full_name,
    'phone',      COALESCE(NULLIF(pm.phone_override, ''), pr.phone),
    'avatar_url', pr.avatar_url,
    'position',   pr.position,
    'branch',     pr.branch,
    'department', pr.department,
    'zalo_url',   pm.zalo_url,
    'member_role', pm.member_role
  )
  FROM public.project_members pm
  JOIN public.profiles pr ON pr.id = pm.user_id
  WHERE pm.project_id = p_project_id
    AND pm.is_primary_contact = true
    AND pr.status = 'active'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._resolve_mobile_primary_contact(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._resolve_mobile_primary_contact(uuid) TO service_role;

-- ============ Mobile product detail ============
CREATE OR REPLACE FUNCTION public.get_mobile_product_detail(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid          uuid := auth.uid();
  v_product      public.products;
  v_project      public.projects;
  v_developer    public.developers;
  v_zone         public.project_zones;
  v_building     public.buildings;
  v_floor        public.floors;
  v_ptype        public.product_types;
  v_can_view_hist boolean := false;
  v_media        jsonb;
  v_prices       jsonb;
  v_fields       jsonb;
  v_price_summary jsonb;
  v_status_summary jsonb;
  v_policies     jsonb;
  v_vouchers     jsonb;
  v_events       jsonb;
  v_contact      jsonb;
  v_is_fav       boolean := false;
BEGIN
  IF v_uid IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
  IF v_product.id IS NULL OR v_product.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.can_access_mobile_project(v_product.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = v_product.project_id;
  SELECT * INTO v_developer FROM public.developers WHERE id = v_project.developer_id;
  IF v_product.zone_id IS NOT NULL THEN
    SELECT * INTO v_zone FROM public.project_zones WHERE id = v_product.zone_id;
  END IF;
  IF v_product.building_id IS NOT NULL THEN
    SELECT * INTO v_building FROM public.buildings WHERE id = v_product.building_id;
  END IF;
  IF v_product.floor_id IS NOT NULL THEN
    SELECT * INTO v_floor FROM public.floors WHERE id = v_product.floor_id;
  END IF;
  IF v_product.product_type_id IS NOT NULL THEN
    SELECT * INTO v_ptype FROM public.product_types WHERE id = v_product.product_type_id;
  END IF;

  v_can_view_hist := public.has_any_role(ARRAY['super_admin','admin','director']::text[])
                     OR public.is_project_manager(v_product.project_id);

  -- Media
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'media_type', m.media_type,
    'file_url', m.file_url,
    'thumbnail_url', m.thumbnail_url,
    'title', m.title,
    'alt_text', m.alt_text,
    'display_order', m.display_order,
    'is_primary', m.is_primary
  ) ORDER BY m.is_primary DESC, m.display_order ASC, m.created_at ASC), '[]'::jsonb)
  INTO v_media
  FROM public.product_media m
  WHERE m.product_id = v_product.id;

  -- Price options (active only)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', po.id,
    'price_code', po.price_code,
    'price_name', po.price_name,
    'amount', po.amount,
    'currency', po.currency,
    'price_per_sqm', po.price_per_sqm,
    'is_primary', po.is_primary,
    'status', po.status,
    'effective_from', po.effective_from,
    'effective_to', po.effective_to
  ) ORDER BY po.is_primary DESC, po.amount ASC), '[]'::jsonb)
  INTO v_prices
  FROM public.product_price_options po
  WHERE po.product_id = v_product.id AND po.status = 'active';

  -- Custom fields (mobile-visible only), with display_value
  SELECT COALESCE(jsonb_agg(row_to_json(cf)::jsonb ORDER BY cf.field_group NULLS LAST, cf.display_order, cf.label), '[]'::jsonb)
  INTO v_fields
  FROM (
    SELECT
      d.id AS definition_id,
      d.field_key,
      d.field_label AS label,
      d.field_group,
      d.data_type,
      d.unit,
      d.help_text,
      d.display_order,
      CASE d.data_type
        WHEN 'text' THEN to_jsonb(cv.value_text)
        WHEN 'long_text' THEN to_jsonb(cv.value_text)
        WHEN 'url' THEN to_jsonb(cv.value_text)
        WHEN 'phone' THEN to_jsonb(cv.value_text)
        WHEN 'integer' THEN to_jsonb(cv.value_integer)
        WHEN 'decimal' THEN to_jsonb(cv.value_decimal)
        WHEN 'boolean' THEN to_jsonb(cv.value_boolean)
        WHEN 'date' THEN to_jsonb(cv.value_date)
        WHEN 'datetime' THEN to_jsonb(cv.value_datetime)
        WHEN 'single_select' THEN to_jsonb(cv.value_text)
        WHEN 'multi_select' THEN cv.value_jsonb
        ELSE NULL
      END AS value,
      CASE d.data_type
        WHEN 'boolean' THEN CASE WHEN cv.value_boolean THEN 'Có' WHEN cv.value_boolean = false THEN 'Không' ELSE NULL END
        WHEN 'single_select' THEN (
          SELECT o.option_label FROM public.product_field_options o
           WHERE o.field_definition_id = d.id AND o.option_value = cv.value_text AND o.status = 'active' LIMIT 1
        )
        WHEN 'multi_select' THEN (
          SELECT string_agg(o.option_label, ', ' ORDER BY o.display_order)
            FROM public.product_field_options o
           WHERE o.field_definition_id = d.id AND o.status = 'active'
             AND cv.value_jsonb ? o.option_value
        )
        ELSE NULL
      END AS display_value
    FROM public.product_field_definitions d
    LEFT JOIN public.product_custom_values cv
      ON cv.field_definition_id = d.id AND cv.product_id = v_product.id
    WHERE d.project_id = v_product.project_id
      AND d.status = 'active'
      AND d.show_in_product_detail = true
      AND (d.product_type_id IS NULL OR d.product_type_id = v_product.product_type_id)
      AND (
        cv.id IS NOT NULL
      )
  ) cf;

  -- Price history summary (privileged only)
  IF v_can_view_hist THEN
    WITH stats AS (
      SELECT COUNT(*)::int AS cnt, MAX(changed_at) AS last_at
      FROM public.product_price_history WHERE product_id = v_product.id
    ),
    latest AS (
      SELECT old_amount, new_amount, changed_at
      FROM public.product_price_history
      WHERE product_id = v_product.id
        AND (price_option_id IS NULL OR price_option_id IN (SELECT id FROM public.product_price_options WHERE product_id = v_product.id AND is_primary = true))
      ORDER BY changed_at DESC LIMIT 1
    ),
    cur AS (
      SELECT amount FROM public.product_price_options WHERE product_id = v_product.id AND is_primary = true AND status = 'active' LIMIT 1
    )
    SELECT jsonb_build_object(
      'can_view', true,
      'has_history', (SELECT cnt > 0 FROM stats),
      'change_count', (SELECT cnt FROM stats),
      'latest_change_at', (SELECT last_at FROM stats),
      'previous_primary_price', (SELECT old_amount FROM latest),
      'current_primary_price', (SELECT amount FROM cur),
      'absolute_change', CASE WHEN (SELECT amount FROM cur) IS NOT NULL AND (SELECT old_amount FROM latest) IS NOT NULL
                              THEN (SELECT amount FROM cur) - (SELECT old_amount FROM latest) ELSE NULL END,
      'percentage_change', CASE WHEN (SELECT old_amount FROM latest) IS NOT NULL AND (SELECT old_amount FROM latest) <> 0 AND (SELECT amount FROM cur) IS NOT NULL
                                THEN ROUND((((SELECT amount FROM cur) - (SELECT old_amount FROM latest)) / (SELECT old_amount FROM latest)) * 100, 2) ELSE NULL END,
      'trend', CASE
        WHEN (SELECT amount FROM cur) IS NULL OR (SELECT old_amount FROM latest) IS NULL THEN 'unknown'
        WHEN (SELECT amount FROM cur) > (SELECT old_amount FROM latest) THEN 'up'
        WHEN (SELECT amount FROM cur) < (SELECT old_amount FROM latest) THEN 'down'
        ELSE 'unchanged'
      END
    ) INTO v_price_summary;
  ELSE
    v_price_summary := jsonb_build_object('can_view', false);
  END IF;

  -- Status history summary
  IF v_can_view_hist THEN
    WITH s AS (
      SELECT COUNT(*)::int AS cnt, MAX(changed_at) AS last_at FROM public.product_status_history WHERE product_id = v_product.id
    ),
    l AS (
      SELECT old_status, new_status, changed_at FROM public.product_status_history WHERE product_id = v_product.id ORDER BY changed_at DESC LIMIT 1
    )
    SELECT jsonb_build_object(
      'can_view', true,
      'change_count', (SELECT cnt FROM s),
      'latest_change_at', (SELECT last_at FROM s),
      'latest_status', (SELECT new_status FROM l),
      'previous_status', (SELECT old_status FROM l)
    ) INTO v_status_summary;
  ELSE
    v_status_summary := jsonb_build_object('can_view', false);
  END IF;

  -- Applicable policies (limit 5)
  BEGIN
    v_policies := public.get_active_project_policies(v_product.project_id, v_product.id, v_product.product_type_id);
    IF jsonb_typeof(v_policies) = 'array' THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', x->>'id',
        'slug', x->>'slug',
        'title', x->>'title',
        'summary', x->>'summary',
        'effective_from', x->>'effective_from',
        'effective_to', x->>'effective_to',
        'registration_deadline', x->>'registration_deadline',
        'is_featured', (x->>'is_featured')::boolean,
        'priority', (x->>'priority')::int
      )), '[]'::jsonb)
      INTO v_policies
      FROM (SELECT value AS x FROM jsonb_array_elements(v_policies) LIMIT 5) t;
    ELSE
      v_policies := '[]'::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN v_policies := '[]'::jsonb;
  END;

  -- Project vouchers (limit 5)
  BEGIN
    v_vouchers := public.get_active_project_vouchers(v_product.project_id, v_product.id, v_product.product_type_id, NULL, 5, 0);
    IF jsonb_typeof(v_vouchers) <> 'array' THEN v_vouchers := '[]'::jsonb; END IF;
  EXCEPTION WHEN OTHERS THEN v_vouchers := '[]'::jsonb;
  END;

  -- Upcoming events (limit 5)
  BEGIN
    v_events := public.get_active_project_events(v_product.project_id, NULL, v_product.id, v_product.product_type_id, NULL, NULL, now(), NULL, 5, 0);
    IF jsonb_typeof(v_events) <> 'array' THEN v_events := '[]'::jsonb; END IF;
  EXCEPTION WHEN OTHERS THEN v_events := '[]'::jsonb;
  END;

  v_contact := public._resolve_mobile_primary_contact(v_product.project_id);

  SELECT EXISTS (SELECT 1 FROM public.favorites WHERE user_id = v_uid AND product_id = v_product.id) INTO v_is_fav;

  RETURN jsonb_build_object(
    'product', jsonb_build_object(
      'id', v_product.id,
      'project_id', v_product.project_id,
      'zone_id', v_product.zone_id,
      'building_id', v_product.building_id,
      'floor_id', v_product.floor_id,
      'floor_number', v_product.floor_number,
      'product_type_id', v_product.product_type_id,
      'product_code', v_product.product_code,
      'product_name', v_product.product_name,
      'external_code', v_product.external_code,
      'category', v_product.category,
      'status', v_product.status,
      'description', v_product.description,
      'direction', v_product.direction,
      'door_direction', v_product.door_direction,
      'balcony_direction', v_product.balcony_direction,
      'view_text', v_product.view_text,
      'land_area', v_product.land_area,
      'construction_area', v_product.construction_area,
      'built_up_area', v_product.built_up_area,
      'carpet_area', v_product.carpet_area,
      'total_floor_area', v_product.total_floor_area,
      'frontage', v_product.frontage,
      'depth', v_product.depth,
      'number_of_floors', v_product.number_of_floors,
      'bedrooms', v_product.bedrooms,
      'bathrooms', v_product.bathrooms,
      'unit_type', v_product.unit_type,
      'handover_standard', v_product.handover_standard,
      'ownership_type', v_product.ownership_type,
      'legal_status', v_product.legal_status,
      'construction_status', v_product.construction_status,
      'featured', v_product.featured,
      'updated_at', v_product.updated_at
    ),
    'project', jsonb_build_object(
      'id', v_project.id, 'name', v_project.name, 'slug', v_project.slug,
      'code', v_project.code, 'location_text', v_project.location_text,
      'province', v_project.province, 'district', v_project.district,
      'thumbnail_url', v_project.thumbnail_url, 'cover_url', v_project.cover_url,
      'logo_url', v_project.logo_url, 'project_category', v_project.project_category,
      'status', v_project.status
    ),
    'developer', CASE WHEN v_developer.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_developer.id, 'name', v_developer.name, 'logo_url', v_developer.logo_url
    ) END,
    'zone',     CASE WHEN v_zone.id IS NULL THEN NULL ELSE jsonb_build_object('id', v_zone.id, 'name', v_zone.name, 'code', v_zone.code) END,
    'building', CASE WHEN v_building.id IS NULL THEN NULL ELSE jsonb_build_object('id', v_building.id, 'name', v_building.name, 'code', v_building.code) END,
    'floor',    CASE WHEN v_floor.id IS NULL THEN NULL ELSE jsonb_build_object('id', v_floor.id, 'floor_number', v_floor.floor_number, 'floor_code', v_floor.floor_code, 'floor_name', v_floor.floor_name) END,
    'product_type', CASE WHEN v_ptype.id IS NULL THEN NULL ELSE jsonb_build_object('id', v_ptype.id, 'name', v_ptype.name) END,
    'media', v_media,
    'price_options', v_prices,
    'custom_fields', v_fields,
    'price_history_summary', v_price_summary,
    'status_history_summary', v_status_summary,
    'applicable_policies', v_policies,
    'project_vouchers', v_vouchers,
    'upcoming_events', v_events,
    'primary_contact', v_contact,
    'permissions', jsonb_build_object(
      'is_favorite', v_is_fav,
      'can_view_history', v_can_view_hist
    )
  );
END
$function$;
REVOKE ALL ON FUNCTION public.get_mobile_product_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_product_detail(uuid) TO authenticated, service_role;

-- ============ Extend get_mobile_project_detail with primary_contact ============
CREATE OR REPLACE FUNCTION public.get_mobile_project_detail(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

-- ============ Favorites RPCs ============
CREATE OR REPLACE FUNCTION public.add_mobile_favorite(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_access_mobile_product(p_product_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.favorites(user_id, product_id) VALUES (v_uid, p_product_id)
  ON CONFLICT (user_id, product_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.add_mobile_favorite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_mobile_favorite(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.remove_mobile_favorite(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.favorites WHERE user_id = v_uid AND product_id = p_product_id;
END $$;
REVOKE ALL ON FUNCTION public.remove_mobile_favorite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_mobile_favorite(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_mobile_favorites(p_limit int DEFAULT 30, p_offset int DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_projects uuid[];
  v_items jsonb;
  v_total int;
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_offset int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF v_uid IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = '42501';
  END IF;

  v_projects := ARRAY(SELECT public.accessible_mobile_project_ids());

  SELECT COUNT(*) INTO v_total
    FROM public.favorites f
    JOIN public.products p ON p.id = f.product_id
   WHERE f.user_id = v_uid
     AND p.archived_at IS NULL
     AND p.project_id = ANY(v_projects);

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.favorited_at DESC, x.product_code ASC, x.product_id ASC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      s.product_id, s.project_id, s.project_name, s.product_code, s.product_name,
      s.category, s.status, s.product_type_name, s.zone_name, s.building_name,
      s.floor_number, s.direction, s.door_direction, s.balcony_direction, s.view_text,
      s.land_area, s.construction_area, s.built_up_area, s.carpet_area,
      s.bedrooms, s.bathrooms, s.primary_price, s.primary_price_name, s.currency,
      s.primary_image_url, s.featured, s.updated_at,
      f.created_at AS favorited_at
    FROM public.favorites f
    JOIN public.inventory_product_summary s ON s.product_id = f.product_id
    WHERE f.user_id = v_uid
      AND s.project_id = ANY(v_projects)
    ORDER BY f.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) x;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', v_total,
    'limit', v_limit,
    'offset', v_offset,
    'has_more', (v_offset + v_limit) < v_total
  );
END $$;
REVOKE ALL ON FUNCTION public.get_mobile_favorites(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mobile_favorites(int, int) TO authenticated, service_role;
