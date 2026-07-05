
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.leads_set_normalized_phone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_product_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_registration_code_value() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_registration_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_any_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_project_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_project_role(uuid, text[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_project_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_project_manager(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.bootstrap_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS developers_read ON public.developers;
DROP POLICY IF EXISTS developers_write ON public.developers;
CREATE POLICY developers_read ON public.developers FOR SELECT TO authenticated
  USING (public.is_active_user() AND (status = 'active' OR public.has_any_role(ARRAY['super_admin','admin','director'])));
CREATE POLICY developers_write ON public.developers FOR ALL TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin','director']))
  WITH CHECK (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin','director']));

DROP POLICY IF EXISTS projects_read ON public.projects;
DROP POLICY IF EXISTS projects_manage ON public.projects;
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY projects_manage ON public.projects FOR ALL TO authenticated
  USING (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(id)))
  WITH CHECK (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(id)));

DROP POLICY IF EXISTS project_zones_read ON public.project_zones;
DROP POLICY IF EXISTS project_zones_manage ON public.project_zones;
CREATE POLICY project_zones_read ON public.project_zones FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY project_zones_manage ON public.project_zones FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS buildings_read ON public.buildings;
DROP POLICY IF EXISTS buildings_manage ON public.buildings;
CREATE POLICY buildings_read ON public.buildings FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY buildings_manage ON public.buildings FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS floors_read ON public.floors;
DROP POLICY IF EXISTS floors_manage ON public.floors;
CREATE POLICY floors_read ON public.floors FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY floors_manage ON public.floors FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = floors.building_id AND public.is_project_manager(b.project_id)))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.buildings b WHERE b.id = floors.building_id AND public.is_project_manager(b.project_id)));

DROP POLICY IF EXISTS product_types_read ON public.product_types;
DROP POLICY IF EXISTS product_types_manage ON public.product_types;
CREATE POLICY product_types_read ON public.product_types FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY product_types_manage ON public.product_types FOR ALL TO authenticated
  USING (public.is_active_user() AND ((project_id IS NULL AND public.has_any_role(ARRAY['super_admin','admin'])) OR (project_id IS NOT NULL AND public.is_project_manager(project_id))))
  WITH CHECK (public.is_active_user() AND ((project_id IS NULL AND public.has_any_role(ARRAY['super_admin','admin'])) OR (project_id IS NOT NULL AND public.is_project_manager(project_id))));

DROP POLICY IF EXISTS project_members_read ON public.project_members;
DROP POLICY IF EXISTS project_members_manage ON public.project_members;
CREATE POLICY project_members_read ON public.project_members FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY project_members_manage ON public.project_members FOR ALL TO authenticated
  USING (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.has_project_role(project_id, ARRAY['project_director','admin'])))
  WITH CHECK (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.has_project_role(project_id, ARRAY['project_director','admin'])));

DROP POLICY IF EXISTS products_read ON public.products;
DROP POLICY IF EXISTS products_insert ON public.products;
DROP POLICY IF EXISTS products_update ON public.products;
DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']));

DROP POLICY IF EXISTS product_media_read ON public.product_media;
DROP POLICY IF EXISTS product_media_manage ON public.product_media;
CREATE POLICY product_media_read ON public.product_media FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY product_media_manage ON public.product_media FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id AND public.is_project_manager(p.project_id)))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id AND public.is_project_manager(p.project_id)));

DROP POLICY IF EXISTS ppo_read ON public.product_price_options;
DROP POLICY IF EXISTS ppo_manage ON public.product_price_options;
CREATE POLICY ppo_read ON public.product_price_options FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY ppo_manage ON public.product_price_options FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_price_options.product_id AND public.is_project_manager(p.project_id)))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_price_options.product_id AND public.is_project_manager(p.project_id)));

DROP POLICY IF EXISTS pph_read ON public.product_price_history;
DROP POLICY IF EXISTS pph_insert ON public.product_price_history;
CREATE POLICY pph_read ON public.product_price_history FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY pph_insert ON public.product_price_history FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_price_history.product_id AND public.is_project_manager(p.project_id)));

DROP POLICY IF EXISTS psh_read ON public.product_status_history;
DROP POLICY IF EXISTS psh_insert ON public.product_status_history;
CREATE POLICY psh_read ON public.product_status_history FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY psh_insert ON public.product_status_history FOR INSERT TO authenticated WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS project_docs_read ON public.project_documents;
DROP POLICY IF EXISTS project_docs_manage ON public.project_documents;
CREATE POLICY project_docs_read ON public.project_documents FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY project_docs_manage ON public.project_documents FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS sales_policies_read ON public.sales_policies;
DROP POLICY IF EXISTS sales_policies_manage ON public.sales_policies;
CREATE POLICY sales_policies_read ON public.sales_policies FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY sales_policies_manage ON public.sales_policies FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS policy_product_types_read ON public.policy_product_types;
DROP POLICY IF EXISTS policy_product_types_manage ON public.policy_product_types;
CREATE POLICY policy_product_types_read ON public.policy_product_types FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY policy_product_types_manage ON public.policy_product_types FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_product_types.policy_id AND public.is_project_manager(sp.project_id)))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_product_types.policy_id AND public.is_project_manager(sp.project_id)));

DROP POLICY IF EXISTS policy_products_read ON public.policy_products;
DROP POLICY IF EXISTS policy_products_manage ON public.policy_products;
CREATE POLICY policy_products_read ON public.policy_products FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY policy_products_manage ON public.policy_products FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_products.policy_id AND public.is_project_manager(sp.project_id)))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.sales_policies sp WHERE sp.id = policy_products.policy_id AND public.is_project_manager(sp.project_id)));

DROP POLICY IF EXISTS vouchers_read ON public.vouchers;
DROP POLICY IF EXISTS vouchers_manage ON public.vouchers;
CREATE POLICY vouchers_read ON public.vouchers FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY vouchers_manage ON public.vouchers FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS events_read ON public.events;
DROP POLICY IF EXISTS events_manage ON public.events;
CREATE POLICY events_read ON public.events FOR SELECT TO authenticated USING (public.is_active_user());
CREATE POLICY events_manage ON public.events FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

DROP POLICY IF EXISTS leads_read ON public.leads;
DROP POLICY IF EXISTS leads_insert ON public.leads;
DROP POLICY IF EXISTS leads_update ON public.leads;
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_read ON public.leads FOR SELECT TO authenticated
  USING (public.is_active_user() AND (
    assigned_to = auth.uid() OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director'])
    OR (interested_project_id IS NOT NULL AND public.is_project_manager(interested_project_id))
  ));
CREATE POLICY leads_insert ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY leads_update ON public.leads FOR UPDATE TO authenticated
  USING (public.is_active_user() AND (
    assigned_to = auth.uid() OR created_by = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director'])
    OR (interested_project_id IS NOT NULL AND public.is_project_manager(interested_project_id))
  ))
  WITH CHECK (public.is_active_user());
CREATE POLICY leads_delete ON public.leads FOR DELETE TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']));

DROP POLICY IF EXISTS registrations_read ON public.registrations;
DROP POLICY IF EXISTS registrations_insert ON public.registrations;
DROP POLICY IF EXISTS registrations_update ON public.registrations;
CREATE POLICY registrations_read ON public.registrations FOR SELECT TO authenticated
  USING (public.is_active_user() AND (
    created_by = auth.uid() OR assigned_to = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director'])
    OR (project_id IS NOT NULL AND public.is_project_manager(project_id))
  ));
CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated WITH CHECK (public.is_active_user());
CREATE POLICY registrations_update ON public.registrations FOR UPDATE TO authenticated
  USING (public.is_active_user() AND (
    created_by = auth.uid() OR assigned_to = auth.uid()
    OR public.has_any_role(ARRAY['super_admin','admin','director'])
    OR (project_id IS NOT NULL AND public.is_project_manager(project_id))
  ))
  WITH CHECK (public.is_active_user());

DROP POLICY IF EXISTS favorites_own ON public.favorites;
CREATE POLICY favorites_own ON public.favorites FOR ALL TO authenticated
  USING (public.is_active_user() AND user_id = auth.uid())
  WITH CHECK (public.is_active_user() AND user_id = auth.uid());

DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
DROP POLICY IF EXISTS notifications_insert_admin ON public.notifications;
CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (public.is_active_user() AND user_id = auth.uid());
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_active_user() AND user_id = auth.uid())
  WITH CHECK (public.is_active_user() AND user_id = auth.uid());
CREATE POLICY notifications_insert_admin ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin','director']));

DROP POLICY IF EXISTS iij_manage ON public.inventory_import_jobs;
CREATE POLICY iij_manage ON public.inventory_import_jobs FOR ALL TO authenticated
  USING (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id)))
  WITH CHECK (public.is_active_user() AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(project_id)));

DROP POLICY IF EXISTS iir_manage ON public.inventory_import_rows;
CREATE POLICY iir_manage ON public.inventory_import_rows FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (SELECT 1 FROM public.inventory_import_jobs j WHERE j.id = inventory_import_rows.import_job_id AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(j.project_id))))
  WITH CHECK (public.is_active_user() AND EXISTS (SELECT 1 FROM public.inventory_import_jobs j WHERE j.id = inventory_import_rows.import_job_id AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_manager(j.project_id))));

DROP POLICY IF EXISTS user_roles_read ON public.user_roles;
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_role(ARRAY['super_admin','admin','director']));

CREATE UNIQUE INDEX IF NOT EXISTS project_members_one_primary_contact_idx
  ON public.project_members(project_id) WHERE is_primary_contact = true;

CREATE OR REPLACE FUNCTION public.set_project_primary_contact(
  p_project_id uuid, p_project_member_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_exists boolean;
BEGIN
  IF NOT (public.has_any_role(ARRAY['super_admin','admin','director'])
          OR public.has_project_role(p_project_id, ARRAY['project_director','admin'])) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE id = p_project_member_id AND project_id = p_project_id) INTO v_exists;
  IF NOT v_exists THEN RAISE EXCEPTION 'member_not_in_project'; END IF;
  UPDATE public.project_members SET is_primary_contact = false
    WHERE project_id = p_project_id AND is_primary_contact = true AND id <> p_project_member_id;
  UPDATE public.project_members SET is_primary_contact = true WHERE id = p_project_member_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'set_primary_contact', 'project_members', p_project_member_id,
          jsonb_build_object('project_id', p_project_id));
END; $$;
REVOKE ALL ON FUNCTION public.set_project_primary_contact(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_project_primary_contact(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bulk_create_floors(
  p_project_id uuid, p_building_id uuid, p_start_floor integer, p_end_floor integer,
  p_excluded_floors integer[] DEFAULT '{}', p_code_prefix text DEFAULT '', p_code_suffix text DEFAULT ''
) RETURNS SETOF public.floors
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_floor integer; v_code text; v_planned integer := 0; v_building_project uuid;
BEGIN
  IF NOT public.is_project_manager(p_project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  SELECT project_id INTO v_building_project FROM public.buildings WHERE id = p_building_id;
  IF v_building_project IS NULL OR v_building_project <> p_project_id THEN
    RAISE EXCEPTION 'building_not_in_project';
  END IF;
  IF p_start_floor IS NULL OR p_end_floor IS NULL OR p_end_floor < p_start_floor THEN
    RAISE EXCEPTION 'invalid_range';
  END IF;
  v_planned := (p_end_floor - p_start_floor + 1) - COALESCE(array_length(p_excluded_floors, 1), 0);
  IF v_planned > 200 THEN RAISE EXCEPTION 'too_many_floors_max_200'; END IF;
  FOR v_floor IN p_start_floor..p_end_floor LOOP
    IF p_excluded_floors IS NOT NULL AND v_floor = ANY(p_excluded_floors) THEN CONTINUE; END IF;
    v_code := COALESCE(p_code_prefix,'') || v_floor::text || COALESCE(p_code_suffix,'');
    IF EXISTS (SELECT 1 FROM public.floors WHERE building_id = p_building_id AND floor_code = v_code) THEN
      RAISE EXCEPTION 'duplicate_floor_code: %', v_code;
    END IF;
  END LOOP;
  FOR v_floor IN p_start_floor..p_end_floor LOOP
    IF p_excluded_floors IS NOT NULL AND v_floor = ANY(p_excluded_floors) THEN CONTINUE; END IF;
    v_code := COALESCE(p_code_prefix,'') || v_floor::text || COALESCE(p_code_suffix,'');
    INSERT INTO public.floors (building_id, floor_number, floor_code, floor_name, display_order)
    VALUES (p_building_id, v_floor, v_code, 'Tầng ' || v_floor, v_floor);
  END LOOP;
  RETURN QUERY SELECT * FROM public.floors WHERE building_id = p_building_id
    AND floor_number BETWEEN p_start_floor AND p_end_floor ORDER BY floor_number;
END; $$;
REVOKE ALL ON FUNCTION public.bulk_create_floors(uuid, uuid, integer, integer, integer[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_create_floors(uuid, uuid, integer, integer, integer[], text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_row_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old jsonb; v_new jsonb; v_entity_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_old := NULL; v_new := to_jsonb(NEW); v_entity_id := (v_new->>'id')::uuid;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    IF v_old = v_new THEN RETURN NEW; END IF;
    v_entity_id := (v_new->>'id')::uuid;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_new := NULL; v_entity_id := (v_old->>'id')::uuid;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
  VALUES (auth.uid(), lower(TG_OP), TG_TABLE_NAME, v_entity_id, v_old, v_new);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.audit_row_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_developers ON public.developers;
CREATE TRIGGER audit_developers AFTER INSERT OR UPDATE OR DELETE ON public.developers FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_projects ON public.projects;
CREATE TRIGGER audit_projects AFTER INSERT OR UPDATE OR DELETE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_project_zones ON public.project_zones;
CREATE TRIGGER audit_project_zones AFTER INSERT OR UPDATE OR DELETE ON public.project_zones FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_buildings ON public.buildings;
CREATE TRIGGER audit_buildings AFTER INSERT OR UPDATE OR DELETE ON public.buildings FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_floors ON public.floors;
CREATE TRIGGER audit_floors AFTER INSERT OR UPDATE OR DELETE ON public.floors FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_product_types ON public.product_types;
CREATE TRIGGER audit_product_types AFTER INSERT OR UPDATE OR DELETE ON public.product_types FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_project_members ON public.project_members;
CREATE TRIGGER audit_project_members AFTER INSERT OR UPDATE OR DELETE ON public.project_members FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();
