
-- =========================================================
-- VIEWS
-- =========================================================
CREATE OR REPLACE VIEW public.inventory_product_summary AS
SELECT
  p.id                                              AS product_id,
  p.project_id,
  pr.name                                           AS project_name,
  p.zone_id,
  z.name                                            AS zone_name,
  p.building_id,
  b.name                                            AS building_name,
  p.floor_id,
  p.floor_number,
  p.product_type_id,
  pt.name                                           AS product_type_name,
  p.product_code,
  p.product_name,
  p.category,
  p.status,
  p.land_area,
  p.construction_area,
  p.carpet_area,
  p.built_up_area,
  p.direction,
  p.door_direction,
  p.balcony_direction,
  p.view_text,
  p.bedrooms,
  p.bathrooms,
  pp.amount                                         AS primary_price,
  pp.price_name                                     AS primary_price_name,
  pp.currency                                       AS currency,
  pm.file_url                                       AS primary_image_url,
  p.featured,
  p.updated_at
FROM public.products p
JOIN public.projects pr ON pr.id = p.project_id AND pr.archived_at IS NULL
LEFT JOIN public.project_zones z ON z.id = p.zone_id
LEFT JOIN public.buildings b ON b.id = p.building_id
LEFT JOIN public.product_types pt ON pt.id = p.product_type_id
LEFT JOIN LATERAL (
  SELECT amount, price_name, currency
  FROM public.product_price_options
  WHERE product_id = p.id AND is_primary = true AND status = 'active'
  ORDER BY updated_at DESC
  LIMIT 1
) pp ON true
LEFT JOIN LATERAL (
  SELECT file_url
  FROM public.product_media
  WHERE product_id = p.id AND media_type = 'image'
  ORDER BY is_primary DESC, display_order ASC, created_at ASC
  LIMIT 1
) pm ON true
WHERE p.archived_at IS NULL;

GRANT SELECT ON public.inventory_product_summary TO authenticated, service_role;

CREATE OR REPLACE VIEW public.project_inventory_stats AS
SELECT
  pr.id AS project_id,
  count(p.id)                                              AS total_products,
  count(p.id) FILTER (WHERE p.status = 'available')        AS available_count,
  count(p.id) FILTER (WHERE p.status = 'holding')          AS holding_count,
  count(p.id) FILTER (WHERE p.status = 'booked')           AS booked_count,
  count(p.id) FILTER (WHERE p.status = 'sold')             AS sold_count,
  count(p.id) FILTER (WHERE p.status = 'locked')           AS locked_count,
  count(p.id) FILTER (WHERE p.status = 'unavailable')      AS unavailable_count,
  max(p.updated_at)                                        AS last_inventory_update
FROM public.projects pr
LEFT JOIN public.products p ON p.project_id = pr.id AND p.archived_at IS NULL
WHERE pr.archived_at IS NULL
GROUP BY pr.id;
GRANT SELECT ON public.project_inventory_stats TO authenticated, service_role;

-- =========================================================
-- RPC: search_inventory
-- =========================================================
CREATE OR REPLACE FUNCTION public.search_inventory(
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
RETURNS SETOF public.inventory_product_summary
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT s.*
  FROM public.inventory_product_summary s
  WHERE (p_project_id IS NULL OR s.project_id = p_project_id)
    AND (p_category IS NULL OR s.category = p_category)
    AND (p_zone_id IS NULL OR s.zone_id = p_zone_id)
    AND (p_building_id IS NULL OR s.building_id = p_building_id)
    AND (p_product_type_id IS NULL OR s.product_type_id = p_product_type_id)
    AND (p_status IS NULL OR s.status = p_status)
    AND (p_floor_min IS NULL OR s.floor_number >= p_floor_min)
    AND (p_floor_max IS NULL OR s.floor_number <= p_floor_max)
    AND (p_area_min IS NULL OR COALESCE(s.carpet_area, s.built_up_area, s.construction_area, s.land_area) >= p_area_min)
    AND (p_area_max IS NULL OR COALESCE(s.carpet_area, s.built_up_area, s.construction_area, s.land_area) <= p_area_max)
    AND (p_price_min IS NULL OR s.primary_price >= p_price_min)
    AND (p_price_max IS NULL OR s.primary_price <= p_price_max)
    AND (p_direction IS NULL OR s.direction = p_direction OR s.door_direction = p_direction OR s.balcony_direction = p_direction)
    AND (
      p_query IS NULL OR p_query = '' OR
      lower(s.product_code) LIKE '%' || lower(p_query) || '%' OR
      lower(COALESCE(s.product_name,'')) LIKE '%' || lower(p_query) || '%'
    )
  ORDER BY s.featured DESC, s.updated_at DESC
  LIMIT COALESCE(p_limit, 30)
  OFFSET COALESCE(p_offset, 0);
$$;
GRANT EXECUTE ON FUNCTION public.search_inventory(uuid,text,text,uuid,uuid,uuid,text,integer,integer,numeric,numeric,numeric,numeric,text,integer,integer) TO authenticated, service_role;

-- =========================================================
-- RPC: get_product_detail
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_product_detail(p_product_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'product', to_jsonb(p),
    'project', to_jsonb(pr),
    'zone', to_jsonb(z),
    'building', to_jsonb(b),
    'floor', to_jsonb(f),
    'product_type', to_jsonb(pt),
    'media', COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.is_primary DESC, m.display_order, m.created_at)
                       FROM public.product_media m WHERE m.product_id = p.id), '[]'::jsonb),
    'price_options', COALESCE((SELECT jsonb_agg(to_jsonb(ppo) ORDER BY ppo.is_primary DESC, ppo.amount)
                               FROM public.product_price_options ppo
                               WHERE ppo.product_id = p.id AND ppo.status = 'active'), '[]'::jsonb),
    'policies', COALESCE((
      SELECT jsonb_agg(DISTINCT to_jsonb(sp))
      FROM public.sales_policies sp
      WHERE sp.project_id = p.project_id
        AND sp.status = 'active' AND sp.archived_at IS NULL
        AND (
          NOT EXISTS (SELECT 1 FROM public.policy_products pp WHERE pp.policy_id = sp.id)
          AND NOT EXISTS (SELECT 1 FROM public.policy_product_types ppt WHERE ppt.policy_id = sp.id)
          OR EXISTS (SELECT 1 FROM public.policy_products pp WHERE pp.policy_id = sp.id AND pp.product_id = p.id)
          OR EXISTS (SELECT 1 FROM public.policy_product_types ppt WHERE ppt.policy_id = sp.id AND ppt.product_type_id = p.product_type_id)
        )
    ), '[]'::jsonb),
    'vouchers', COALESCE((SELECT jsonb_agg(to_jsonb(v))
                          FROM public.vouchers v
                          WHERE v.project_id = p.project_id AND v.status = 'active' AND v.archived_at IS NULL), '[]'::jsonb),
    'primary_contact', (
      SELECT to_jsonb(prof) FROM public.project_members pm
      JOIN public.profiles prof ON prof.id = pm.user_id
      WHERE pm.project_id = p.project_id AND pm.is_primary_contact = true
      LIMIT 1
    )
  )
  FROM public.products p
  JOIN public.projects pr ON pr.id = p.project_id
  LEFT JOIN public.project_zones z ON z.id = p.zone_id
  LEFT JOIN public.buildings b ON b.id = p.building_id
  LEFT JOIN public.floors f ON f.id = p.floor_id
  LEFT JOIN public.product_types pt ON pt.id = p.product_type_id
  WHERE p.id = p_product_id AND p.archived_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.get_product_detail(uuid) TO authenticated, service_role;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Helper role sets (as SQL): admin_pack = super_admin/admin/director
-- We inline these directly in policies to avoid a wrapper function.

-- PROFILES
CREATE POLICY profiles_select_self ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_any_role(ARRAY['super_admin','admin']))
  WITH CHECK (id = auth.uid() OR public.has_any_role(ARRAY['super_admin','admin']));
CREATE POLICY profiles_insert_self ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_any_role(ARRAY['super_admin','admin']));

-- ROLES: any authenticated read; only super_admin write (not exposed via API here)
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);

-- USER_ROLES: user sees own; super_admin sees all
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role('super_admin'));

-- DEVELOPERS
CREATE POLICY developers_read ON public.developers FOR SELECT TO authenticated USING (status = 'active' OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY developers_write ON public.developers FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin']))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin']));

-- PROJECTS
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY projects_manage ON public.projects FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(id));

-- PROJECT_ZONES
CREATE POLICY project_zones_read ON public.project_zones FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY project_zones_manage ON public.project_zones FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

-- BUILDINGS
CREATE POLICY buildings_read ON public.buildings FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY buildings_manage ON public.buildings FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

-- FLOORS
CREATE POLICY floors_read ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY floors_manage ON public.floors FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.buildings b WHERE b.id = building_id AND public.is_project_manager(b.project_id)
  ))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.buildings b WHERE b.id = building_id AND public.is_project_manager(b.project_id)
  ));

-- PRODUCT_TYPES
CREATE POLICY product_types_read ON public.product_types FOR SELECT TO authenticated USING (status = 'active' OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY product_types_manage ON public.product_types FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR (project_id IS NOT NULL AND public.is_project_manager(project_id)))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR (project_id IS NOT NULL AND public.is_project_manager(project_id)));

-- PROJECT_MEMBERS
CREATE POLICY project_members_read ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY project_members_manage ON public.project_members FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

-- PRODUCTS
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']));

-- PRODUCT_MEDIA
CREATE POLICY product_media_read ON public.product_media FOR SELECT TO authenticated USING (true);
CREATE POLICY product_media_manage ON public.product_media FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ));

-- PRODUCT_PRICE_OPTIONS
CREATE POLICY ppo_read ON public.product_price_options FOR SELECT TO authenticated USING (true);
CREATE POLICY ppo_manage ON public.product_price_options FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ));

-- PRICE HISTORY (append-only)
CREATE POLICY pph_read ON public.product_price_history FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_member(p.project_id)
  ));
CREATE POLICY pph_insert ON public.product_price_history FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ));

-- STATUS HISTORY (append-only)
CREATE POLICY psh_read ON public.product_status_history FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_member(p.project_id)
  ));
CREATE POLICY psh_insert ON public.product_status_history FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_id AND public.is_project_manager(p.project_id)
  ));

-- PROJECT_DOCUMENTS
CREATE POLICY project_docs_read ON public.project_documents FOR SELECT TO authenticated
  USING (
    (is_public = true AND status = 'active' AND archived_at IS NULL)
    OR public.has_any_role(ARRAY['super_admin','admin','director'])
    OR public.is_project_member(project_id)
  );
CREATE POLICY project_docs_manage ON public.project_documents FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

-- SALES_POLICIES
CREATE POLICY sales_policies_read ON public.sales_policies FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY sales_policies_manage ON public.sales_policies FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

CREATE POLICY policy_product_types_read ON public.policy_product_types FOR SELECT TO authenticated USING (true);
CREATE POLICY policy_product_types_manage ON public.policy_product_types FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_id AND public.is_project_manager(sp.project_id)
  ))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_id AND public.is_project_manager(sp.project_id)
  ));

CREATE POLICY policy_products_read ON public.policy_products FOR SELECT TO authenticated USING (true);
CREATE POLICY policy_products_manage ON public.policy_products FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_id AND public.is_project_manager(sp.project_id)
  ))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR EXISTS (
    SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_id AND public.is_project_manager(sp.project_id)
  ));

-- VOUCHERS
CREATE POLICY vouchers_read ON public.vouchers FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY vouchers_manage ON public.vouchers FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id));

-- EVENTS
CREATE POLICY events_read ON public.events FOR SELECT TO authenticated
  USING (archived_at IS NULL OR public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY events_manage ON public.events FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']) OR (project_id IS NOT NULL AND public.is_project_manager(project_id)))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director']) OR (project_id IS NOT NULL AND public.is_project_manager(project_id)));

-- LEAD_SOURCES
CREATE POLICY lead_sources_read ON public.lead_sources FOR SELECT TO authenticated USING (true);

-- LEADS
CREATE POLICY leads_read ON public.leads FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','marketing'])
    OR (interested_project_id IS NOT NULL AND public.is_project_manager(interested_project_id))
  );
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(ARRAY['super_admin','admin','director','sales_manager','sales','marketing'])
  );
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','sales_manager'])
    OR (interested_project_id IS NOT NULL AND public.is_project_manager(interested_project_id))
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','sales_manager'])
    OR (interested_project_id IS NOT NULL AND public.is_project_manager(interested_project_id))
  );
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']));

-- REGISTRATIONS
CREATE POLICY registrations_read ON public.registrations FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','sales_manager','marketing'])
    OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  );
CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director','sales_manager','sales','marketing']));
CREATE POLICY registrations_update ON public.registrations FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','sales_manager'])
    OR (project_id IS NOT NULL AND public.is_project_manager(project_id))
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director','sales_manager'])
    OR (project_id IS NOT NULL AND public.is_project_manager(project_id))
  );

-- FAVORITES
CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_insert_admin ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director','sales_manager']));

-- INVENTORY IMPORT
CREATE POLICY iij_manage ON public.inventory_import_jobs FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director','project_director','sales_manager']))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director','project_director','sales_manager']));
CREATE POLICY iir_manage ON public.inventory_import_rows FOR ALL TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director','project_director','sales_manager']))
  WITH CHECK (public.has_any_role(ARRAY['super_admin','admin','director','project_director','sales_manager']));

-- AUDIT LOGS
CREATE POLICY audit_logs_read ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']));
CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- =========================================================
-- REALTIME PUBLICATION
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_price_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_policies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
