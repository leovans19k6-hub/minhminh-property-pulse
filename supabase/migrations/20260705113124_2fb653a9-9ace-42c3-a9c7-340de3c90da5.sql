-- =========================================================================
-- Phase 5E — Inventory Engine hardening (DB layer) — retry
-- =========================================================================

-- 1) FIELD DEFINITION HARDENING
CREATE OR REPLACE FUNCTION public.validate_product_field_definition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_pt_project uuid;
BEGIN
  IF NEW.field_key IS NULL OR NEW.field_key !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'invalid_field_key_format';
  END IF;
  IF public.is_reserved_product_field_key(NEW.field_key) THEN
    RAISE EXCEPTION 'field_key_is_reserved: %', NEW.field_key;
  END IF;
  IF NEW.product_type_id IS NOT NULL THEN
    SELECT project_id INTO v_pt_project FROM public.product_types WHERE id = NEW.product_type_id;
    IF v_pt_project IS NOT NULL AND v_pt_project <> NEW.project_id THEN
      RAISE EXCEPTION 'product_type_belongs_to_different_project';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_product_field_data_type_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.data_type IS DISTINCT FROM OLD.data_type THEN
    IF EXISTS (SELECT 1 FROM public.product_custom_values WHERE field_definition_id = NEW.id) THEN
      RAISE EXCEPTION 'data_type_immutable_once_values_exist';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_guard_field_data_type ON public.product_field_definitions;
CREATE TRIGGER trg_guard_field_data_type
  BEFORE UPDATE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_product_field_data_type_immutable();

-- 2) INVENTORY VIEW TRUSTED OPS
CREATE OR REPLACE FUNCTION public.save_inventory_view_fields(p_view_id uuid, p_fields jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_project uuid; v_item jsonb; v_count int := 0;
  v_source text; v_price_code text; v_core text; v_field_id uuid;
  v_pf_project uuid; v_seen jsonb := '{}'::jsonb; v_key text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  SELECT project_id INTO v_project FROM public.inventory_views WHERE id = p_view_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'view_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_project) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_fields) <> 'array' THEN RAISE EXCEPTION 'fields_must_be_array'; END IF;
  IF jsonb_array_length(p_fields) > 100 THEN RAISE EXCEPTION 'too_many_fields_max_100'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_fields) LOOP
    v_source := v_item->>'field_source';
    v_core := v_item->>'core_field_key';
    v_field_id := NULLIF(v_item->>'field_definition_id','')::uuid;
    v_price_code := v_item->>'price_code';
    IF v_source NOT IN ('core','custom','price') THEN RAISE EXCEPTION 'invalid_field_source: %', v_source; END IF;
    IF v_source = 'core' THEN
      IF v_core IS NULL OR NOT public.is_reserved_product_field_key(v_core) THEN
        RAISE EXCEPTION 'invalid_core_field_key: %', COALESCE(v_core,'null');
      END IF;
      IF v_field_id IS NOT NULL OR v_price_code IS NOT NULL THEN
        RAISE EXCEPTION 'core_field_must_not_have_definition_or_price';
      END IF;
      v_key := 'core:' || v_core;
    ELSIF v_source = 'custom' THEN
      IF v_field_id IS NULL THEN RAISE EXCEPTION 'custom_field_requires_definition'; END IF;
      SELECT project_id INTO v_pf_project FROM public.product_field_definitions WHERE id = v_field_id AND status='active';
      IF v_pf_project IS NULL THEN RAISE EXCEPTION 'field_definition_not_active_or_missing'; END IF;
      IF v_pf_project <> v_project THEN RAISE EXCEPTION 'field_definition_wrong_project'; END IF;
      IF v_core IS NOT NULL OR v_price_code IS NOT NULL THEN
        RAISE EXCEPTION 'custom_field_must_not_have_core_or_price';
      END IF;
      v_key := 'custom:' || v_field_id::text;
    ELSE
      IF v_price_code IS NULL OR v_price_code NOT IN ('primary','secondary','vat','total','discount') THEN
        RAISE EXCEPTION 'invalid_price_code: %', COALESCE(v_price_code,'null');
      END IF;
      IF v_core IS NOT NULL OR v_field_id IS NOT NULL THEN
        RAISE EXCEPTION 'price_field_must_not_have_core_or_definition';
      END IF;
      v_key := 'price:' || v_price_code;
    END IF;
    IF v_seen ? v_key THEN RAISE EXCEPTION 'duplicate_field: %', v_key; END IF;
    v_seen := v_seen || jsonb_build_object(v_key, true);
  END LOOP;

  DELETE FROM public.inventory_view_fields WHERE inventory_view_id = p_view_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_fields) LOOP
    INSERT INTO public.inventory_view_fields (
      inventory_view_id, field_source, core_field_key, field_definition_id, price_code,
      column_label, display_order, width, visible, pinned,
      sortable, filterable, searchable, mobile_visible
    ) VALUES (
      p_view_id, v_item->>'field_source', v_item->>'core_field_key',
      NULLIF(v_item->>'field_definition_id','')::uuid, v_item->>'price_code',
      COALESCE(v_item->>'column_label',''), COALESCE((v_item->>'display_order')::int, 0),
      NULLIF(v_item->>'width','')::int, COALESCE((v_item->>'visible')::boolean, true),
      NULLIF(v_item->>'pinned',''), COALESCE((v_item->>'sortable')::boolean, false),
      COALESCE((v_item->>'filterable')::boolean, false), COALESCE((v_item->>'searchable')::boolean, false),
      COALESCE((v_item->>'mobile_visible')::boolean, false)
    );
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.inventory_views SET updated_at = now() WHERE id = p_view_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'save_view_fields', 'inventory_views', p_view_id, jsonb_build_object('count', v_count));
  RETURN v_count;
END $function$;

CREATE OR REPLACE FUNCTION public.duplicate_inventory_view(p_source_id uuid, p_name text, p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_src RECORD; v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  IF p_code !~ '^[a-z][a-z0-9_]{0,62}$' THEN RAISE EXCEPTION 'invalid_code_format'; END IF;
  SELECT * INTO v_src FROM public.inventory_views WHERE id = p_source_id;
  IF v_src IS NULL THEN RAISE EXCEPTION 'source_view_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_src.project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.inventory_views WHERE project_id = v_src.project_id AND code = p_code) THEN
    RAISE EXCEPTION 'code_already_exists';
  END IF;
  INSERT INTO public.inventory_views (
    project_id, name, code, description, view_type, status,
    default_sort_field, default_sort_direction, page_size, is_default
  ) VALUES (
    v_src.project_id, p_name, p_code, v_src.description, v_src.view_type, 'active',
    v_src.default_sort_field, v_src.default_sort_direction, v_src.page_size, false
  ) RETURNING id INTO v_new_id;
  INSERT INTO public.inventory_view_fields (
    inventory_view_id, field_source, core_field_key, field_definition_id, price_code,
    column_label, display_order, width, visible, pinned, sortable, filterable, searchable, mobile_visible
  )
  SELECT v_new_id, field_source, core_field_key, field_definition_id, price_code,
         column_label, display_order, width, visible, pinned, sortable, filterable, searchable, mobile_visible
  FROM public.inventory_view_fields WHERE inventory_view_id = p_source_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'duplicate_view', 'inventory_views', v_new_id, jsonb_build_object('source_id', p_source_id));
  RETURN v_new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.set_default_inventory_view(p_view_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_view RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_view FROM public.inventory_views WHERE id = p_view_id;
  IF v_view IS NULL THEN RAISE EXCEPTION 'view_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_view.project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  UPDATE public.inventory_views SET is_default = false
   WHERE project_id = v_view.project_id AND view_type = v_view.view_type AND id <> p_view_id;
  UPDATE public.inventory_views SET is_default = true, status = 'active' WHERE id = p_view_id;
  IF v_view.view_type = 'admin_table' THEN
    UPDATE public.project_inventory_settings SET default_admin_view_id = p_view_id WHERE project_id = v_view.project_id;
  ELSIF v_view.view_type = 'mobile_list' THEN
    UPDATE public.project_inventory_settings SET default_mobile_view_id = p_view_id WHERE project_id = v_view.project_id;
  END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'set_default_view', 'inventory_views', p_view_id,
          jsonb_build_object('project_id', v_view.project_id, 'view_type', v_view.view_type));
END $function$;

CREATE OR REPLACE FUNCTION public.validate_inventory_view(p_view_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_view RECORD; v_errors jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb; v_count int; v_bad int;
BEGIN
  SELECT * INTO v_view FROM public.inventory_views WHERE id = p_view_id;
  IF v_view IS NULL THEN
    RETURN jsonb_build_object('is_valid', false, 'errors', jsonb_build_array('view_not_found'), 'warnings', v_warnings);
  END IF;
  SELECT count(*) INTO v_count FROM public.inventory_view_fields WHERE inventory_view_id = p_view_id;
  IF v_count = 0 THEN v_warnings := v_warnings || jsonb_build_array('view_has_no_fields'); END IF;
  IF v_count > 100 THEN v_errors := v_errors || jsonb_build_array('too_many_fields'); END IF;
  SELECT count(*) INTO v_bad
    FROM public.inventory_view_fields vf
    LEFT JOIN public.product_field_definitions fd ON fd.id = vf.field_definition_id
   WHERE vf.inventory_view_id = p_view_id AND vf.field_source = 'custom'
     AND (fd.id IS NULL OR fd.project_id <> v_view.project_id OR fd.status <> 'active');
  IF v_bad > 0 THEN v_errors := v_errors || jsonb_build_array('has_invalid_custom_fields'); END IF;
  RETURN jsonb_build_object('is_valid', jsonb_array_length(v_errors) = 0, 'errors', v_errors, 'warnings', v_warnings, 'field_count', v_count);
END $function$;

-- 3) PRICING
CREATE UNIQUE INDEX IF NOT EXISTS product_price_options_one_primary_active
  ON public.product_price_options (product_id)
  WHERE is_primary = true AND status = 'active';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_price_options_amount_nonneg') THEN
    ALTER TABLE public.product_price_options ADD CONSTRAINT product_price_options_amount_nonneg CHECK (amount >= 0);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.log_product_price_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_price_history (product_id, price_option_id, price_code, old_amount, new_amount, currency, source, changed_by)
    VALUES (NEW.product_id, NEW.id, NEW.price_code, NULL, NEW.amount, NEW.currency, 'trigger', auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.is_primary IS DISTINCT FROM OLD.is_primary THEN
      INSERT INTO public.product_price_history (product_id, price_option_id, price_code, old_amount, new_amount, currency, source, changed_by, metadata)
      VALUES (NEW.product_id, NEW.id, NEW.price_code, OLD.amount, NEW.amount, NEW.currency, 'trigger', auth.uid(),
              jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status,
                                 'old_is_primary', OLD.is_primary, 'new_is_primary', NEW.is_primary));
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_log_price_change ON public.product_price_options;
CREATE TRIGGER trg_log_price_change AFTER INSERT OR UPDATE ON public.product_price_options
  FOR EACH ROW EXECUTE FUNCTION public.log_product_price_change();

-- 4) RELATIONSHIP VALIDATION
CREATE OR REPLACE FUNCTION public.validate_product_relationships(
  p_project_id uuid, p_zone_id uuid, p_building_id uuid, p_floor_id uuid, p_product_type_id uuid
) RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_p uuid; v_b_zone uuid; v_b_project uuid; v_f_building uuid;
BEGIN
  IF p_zone_id IS NOT NULL THEN
    SELECT project_id INTO v_p FROM public.project_zones WHERE id = p_zone_id;
    IF v_p IS NULL OR v_p <> p_project_id THEN RAISE EXCEPTION 'zone_wrong_project'; END IF;
  END IF;
  IF p_building_id IS NOT NULL THEN
    SELECT project_id, zone_id INTO v_b_project, v_b_zone FROM public.buildings WHERE id = p_building_id;
    IF v_b_project IS NULL OR v_b_project <> p_project_id THEN RAISE EXCEPTION 'building_wrong_project'; END IF;
    IF p_zone_id IS NOT NULL AND v_b_zone IS NOT NULL AND v_b_zone <> p_zone_id THEN RAISE EXCEPTION 'building_wrong_zone'; END IF;
  END IF;
  IF p_floor_id IS NOT NULL THEN
    SELECT building_id INTO v_f_building FROM public.floors WHERE id = p_floor_id;
    IF v_f_building IS NULL THEN RAISE EXCEPTION 'floor_not_found'; END IF;
    IF p_building_id IS NOT NULL AND v_f_building <> p_building_id THEN RAISE EXCEPTION 'floor_wrong_building'; END IF;
  END IF;
  IF p_product_type_id IS NOT NULL THEN
    SELECT project_id INTO v_p FROM public.product_types WHERE id = p_product_type_id;
    IF v_p IS NOT NULL AND v_p <> p_project_id THEN RAISE EXCEPTION 'product_type_wrong_project'; END IF;
  END IF;
END $function$;

-- 5) CUSTOM VALUES APPLIER
CREATE OR REPLACE FUNCTION public._apply_product_custom_values(
  p_product_id uuid, p_project_id uuid, p_product_type_id uuid, p_values jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_item jsonb; v_field_key text; v_field record; v_rules jsonb;
  v_raw text; v_num numeric; v_min numeric; v_max numeric;
  v_pattern text; v_max_len int; v_min_len int;
BEGIN
  IF p_values IS NOT NULL AND jsonb_typeof(p_values) = 'object' THEN
    FOR v_field_key, v_item IN SELECT * FROM jsonb_each(p_values) LOOP
      SELECT id, data_type, validation_rules, is_required, product_type_id, status
        INTO v_field FROM public.product_field_definitions
       WHERE project_id = p_project_id AND field_key = v_field_key;
      IF v_field.id IS NULL THEN RAISE EXCEPTION 'unknown_field_key: %', v_field_key; END IF;
      IF v_field.status <> 'active' THEN RAISE EXCEPTION 'field_not_active: %', v_field_key; END IF;
      IF v_field.product_type_id IS NOT NULL AND v_field.product_type_id IS DISTINCT FROM p_product_type_id THEN
        RAISE EXCEPTION 'field_not_applicable_to_product_type: %', v_field_key;
      END IF;
      IF v_item IS NULL OR jsonb_typeof(v_item) = 'null' THEN
        DELETE FROM public.product_custom_values WHERE product_id = p_product_id AND field_definition_id = v_field.id;
        CONTINUE;
      END IF;
      v_rules := COALESCE(v_field.validation_rules, '{}'::jsonb);
      IF v_field.data_type IN ('integer','decimal') THEN
        v_num := (v_item#>>'{}')::numeric;
        v_min := NULLIF(v_rules->>'min','')::numeric;
        v_max := NULLIF(v_rules->>'max','')::numeric;
        IF v_min IS NOT NULL AND v_num < v_min THEN RAISE EXCEPTION 'value_below_min: %', v_field_key; END IF;
        IF v_max IS NOT NULL AND v_num > v_max THEN RAISE EXCEPTION 'value_above_max: %', v_field_key; END IF;
      ELSIF v_field.data_type IN ('text','long_text','url','phone') THEN
        v_raw := v_item#>>'{}';
        v_max_len := NULLIF(v_rules->>'max_length','')::int;
        v_min_len := NULLIF(v_rules->>'min_length','')::int;
        v_pattern := NULLIF(v_rules->>'pattern','');
        IF v_min_len IS NOT NULL AND length(v_raw) < v_min_len THEN RAISE EXCEPTION 'value_too_short: %', v_field_key; END IF;
        IF v_max_len IS NOT NULL AND length(v_raw) > v_max_len THEN RAISE EXCEPTION 'value_too_long: %', v_field_key; END IF;
        IF v_pattern IS NOT NULL AND v_raw !~ v_pattern THEN RAISE EXCEPTION 'value_pattern_mismatch: %', v_field_key; END IF;
      END IF;
      INSERT INTO public.product_custom_values (
        product_id, field_definition_id, value_text, value_integer, value_decimal, value_boolean,
        value_date, value_datetime, value_jsonb
      ) VALUES (
        p_product_id, v_field.id,
        CASE WHEN v_field.data_type IN ('text','long_text','url','phone','single_select') THEN v_item#>>'{}' END,
        CASE WHEN v_field.data_type = 'integer' THEN (v_item#>>'{}')::bigint END,
        CASE WHEN v_field.data_type = 'decimal' THEN (v_item#>>'{}')::numeric END,
        CASE WHEN v_field.data_type = 'boolean' THEN (v_item#>>'{}')::boolean END,
        CASE WHEN v_field.data_type = 'date' THEN (v_item#>>'{}')::date END,
        CASE WHEN v_field.data_type = 'datetime' THEN (v_item#>>'{}')::timestamptz END,
        CASE WHEN v_field.data_type = 'multi_select' THEN v_item END
      )
      ON CONFLICT (product_id, field_definition_id) DO UPDATE SET
        value_text = EXCLUDED.value_text, value_integer = EXCLUDED.value_integer,
        value_decimal = EXCLUDED.value_decimal, value_boolean = EXCLUDED.value_boolean,
        value_date = EXCLUDED.value_date, value_datetime = EXCLUDED.value_datetime,
        value_jsonb = EXCLUDED.value_jsonb, updated_at = now();
    END LOOP;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.product_field_definitions fd
    WHERE fd.project_id = p_project_id AND fd.status = 'active' AND fd.is_required = true
      AND (fd.product_type_id IS NULL OR fd.product_type_id = p_product_type_id)
      AND NOT EXISTS (SELECT 1 FROM public.product_custom_values pcv
                      WHERE pcv.product_id = p_product_id AND pcv.field_definition_id = fd.id)
  ) THEN RAISE EXCEPTION 'required_custom_fields_missing'; END IF;
END $function$;

-- 6) PRICES APPLIER
CREATE OR REPLACE FUNCTION public._apply_product_prices(p_product_id uuid, p_prices jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_item jsonb; v_id uuid; v_primary_count int := 0; v_seen jsonb := '{}'::jsonb; v_code text;
BEGIN
  IF p_prices IS NULL OR jsonb_typeof(p_prices) <> 'array' THEN RETURN; END IF;
  IF jsonb_array_length(p_prices) > 50 THEN RAISE EXCEPTION 'too_many_price_options_max_50'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_prices) LOOP
    v_code := v_item->>'price_code';
    IF v_code IS NULL OR length(v_code) = 0 THEN RAISE EXCEPTION 'price_code_required'; END IF;
    IF v_seen ? v_code THEN RAISE EXCEPTION 'duplicate_price_code: %', v_code; END IF;
    v_seen := v_seen || jsonb_build_object(v_code, true);
    IF COALESCE((v_item->>'is_primary')::boolean, false) AND COALESCE(v_item->>'status','active') = 'active' THEN
      v_primary_count := v_primary_count + 1;
    END IF;
  END LOOP;
  IF v_primary_count > 1 THEN RAISE EXCEPTION 'only_one_primary_active_price_allowed'; END IF;

  UPDATE public.product_price_options SET status = 'archived', updated_at = now()
   WHERE product_id = p_product_id AND status = 'active'
     AND NOT (price_code = ANY (
       SELECT jsonb_array_elements_text(COALESCE((SELECT jsonb_agg(x->>'price_code') FROM jsonb_array_elements(p_prices) x), '[]'::jsonb))
     ));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_prices) LOOP
    SELECT id INTO v_id FROM public.product_price_options
     WHERE product_id = p_product_id AND price_code = v_item->>'price_code';
    IF v_id IS NULL THEN
      INSERT INTO public.product_price_options (
        product_id, price_code, price_name, amount, currency, is_primary, status,
        effective_from, effective_to, payment_term_summary
      ) VALUES (
        p_product_id, v_item->>'price_code', v_item->>'price_name',
        COALESCE((v_item->>'amount')::numeric, 0), COALESCE(v_item->>'currency','VND'),
        COALESCE((v_item->>'is_primary')::boolean, false), COALESCE(v_item->>'status','active'),
        NULLIF(v_item->>'effective_from','')::timestamptz, NULLIF(v_item->>'effective_to','')::timestamptz,
        v_item->>'payment_term_summary'
      );
    ELSE
      UPDATE public.product_price_options SET
        price_name = v_item->>'price_name',
        amount = COALESCE((v_item->>'amount')::numeric, amount),
        currency = COALESCE(v_item->>'currency', currency),
        is_primary = COALESCE((v_item->>'is_primary')::boolean, is_primary),
        status = COALESCE(v_item->>'status', status),
        effective_from = NULLIF(v_item->>'effective_from','')::timestamptz,
        effective_to = NULLIF(v_item->>'effective_to','')::timestamptz,
        payment_term_summary = v_item->>'payment_term_summary', updated_at = now()
       WHERE id = v_id;
    END IF;
  END LOOP;
END $function$;

-- 7) PRODUCT MUTATION ENGINE
CREATE OR REPLACE FUNCTION public.create_product_with_values(
  p_project_id uuid, p_core jsonb, p_custom jsonb DEFAULT NULL, p_prices jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_product_id uuid; v_zone uuid; v_building uuid; v_floor uuid; v_ptype uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  IF NOT public.is_project_manager(p_project_id) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  IF p_core->>'product_code' IS NULL OR length(trim(p_core->>'product_code')) = 0 THEN RAISE EXCEPTION 'product_code_required'; END IF;
  v_zone := NULLIF(p_core->>'zone_id','')::uuid;
  v_building := NULLIF(p_core->>'building_id','')::uuid;
  v_floor := NULLIF(p_core->>'floor_id','')::uuid;
  v_ptype := NULLIF(p_core->>'product_type_id','')::uuid;
  PERFORM public.validate_product_relationships(p_project_id, v_zone, v_building, v_floor, v_ptype);
  INSERT INTO public.products (
    project_id, product_code, product_name, category, status,
    product_type_id, zone_id, building_id, floor_id,
    featured, description, inventory_source, external_code
  ) VALUES (
    p_project_id, trim(p_core->>'product_code'),
    COALESCE(p_core->>'product_name', trim(p_core->>'product_code')),
    COALESCE(p_core->>'category','apartment'), COALESCE(p_core->>'status','available'),
    v_ptype, v_zone, v_building, v_floor,
    COALESCE((p_core->>'featured')::boolean, false), p_core->>'description',
    COALESCE(p_core->>'inventory_source','manual'), p_core->>'external_code'
  ) RETURNING id INTO v_product_id;
  PERFORM public._apply_product_custom_values(v_product_id, p_project_id, v_ptype, p_custom);
  PERFORM public._apply_product_prices(v_product_id, p_prices);
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'create_product', 'products', v_product_id,
          jsonb_build_object('project_id', p_project_id, 'product_code', p_core->>'product_code'));
  RETURN v_product_id;
END $function$;

CREATE OR REPLACE FUNCTION public.update_product_with_values(
  p_product_id uuid, p_core jsonb DEFAULT NULL, p_custom jsonb DEFAULT NULL, p_prices jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  v_project uuid; v_ptype uuid; v_zone uuid; v_building uuid; v_floor uuid;
  v_new_ptype uuid; v_new_zone uuid; v_new_building uuid; v_new_floor uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  SELECT project_id, product_type_id, zone_id, building_id, floor_id
    INTO v_project, v_ptype, v_zone, v_building, v_floor
    FROM public.products WHERE id = p_product_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_project) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  IF p_core IS NOT NULL THEN
    v_new_ptype := COALESCE(NULLIF(p_core->>'product_type_id','')::uuid, v_ptype);
    v_new_zone := COALESCE(NULLIF(p_core->>'zone_id','')::uuid, v_zone);
    v_new_building := COALESCE(NULLIF(p_core->>'building_id','')::uuid, v_building);
    v_new_floor := COALESCE(NULLIF(p_core->>'floor_id','')::uuid, v_floor);
    IF p_core ? 'zone_id' AND jsonb_typeof(p_core->'zone_id') = 'null' THEN v_new_zone := NULL; END IF;
    IF p_core ? 'building_id' AND jsonb_typeof(p_core->'building_id') = 'null' THEN v_new_building := NULL; END IF;
    IF p_core ? 'floor_id' AND jsonb_typeof(p_core->'floor_id') = 'null' THEN v_new_floor := NULL; END IF;
    IF p_core ? 'product_type_id' AND jsonb_typeof(p_core->'product_type_id') = 'null' THEN v_new_ptype := NULL; END IF;
    PERFORM public.validate_product_relationships(v_project, v_new_zone, v_new_building, v_new_floor, v_new_ptype);
    UPDATE public.products SET
      product_code = COALESCE(NULLIF(p_core->>'product_code',''), product_code),
      product_name = COALESCE(p_core->>'product_name', product_name),
      category = COALESCE(p_core->>'category', category),
      status = COALESCE(p_core->>'status', status),
      product_type_id = v_new_ptype, zone_id = v_new_zone,
      building_id = v_new_building, floor_id = v_new_floor,
      featured = COALESCE((p_core->>'featured')::boolean, featured),
      description = COALESCE(p_core->>'description', description),
      external_code = COALESCE(p_core->>'external_code', external_code),
      updated_at = now()
    WHERE id = p_product_id;
    v_ptype := v_new_ptype;
  END IF;
  PERFORM public._apply_product_custom_values(p_product_id, v_project, v_ptype, p_custom);
  PERFORM public._apply_product_prices(p_product_id, p_prices);
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'update_product', 'products', p_product_id, jsonb_build_object('project_id', v_project));
END $function$;

CREATE OR REPLACE FUNCTION public.clone_product(p_source_id uuid, p_new_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_src RECORD; v_new uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  IF p_new_code IS NULL OR length(trim(p_new_code)) = 0 THEN RAISE EXCEPTION 'product_code_required'; END IF;
  SELECT * INTO v_src FROM public.products WHERE id = p_source_id;
  IF v_src IS NULL THEN RAISE EXCEPTION 'source_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_src.project_id) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  INSERT INTO public.products (
    project_id, product_code, product_name, category, status, product_type_id,
    zone_id, building_id, floor_id, featured, description, inventory_source, external_code
  ) VALUES (
    v_src.project_id, trim(p_new_code), v_src.product_name, v_src.category, 'available',
    v_src.product_type_id, v_src.zone_id, v_src.building_id, v_src.floor_id,
    v_src.featured, v_src.description, 'clone', NULL
  ) RETURNING id INTO v_new;
  INSERT INTO public.product_custom_values (
    product_id, field_definition_id, value_text, value_integer, value_decimal,
    value_boolean, value_date, value_datetime, value_jsonb
  )
  SELECT v_new, field_definition_id, value_text, value_integer, value_decimal,
         value_boolean, value_date, value_datetime, value_jsonb
  FROM public.product_custom_values WHERE product_id = p_source_id;
  INSERT INTO public.product_price_options (
    product_id, price_code, price_name, amount, currency, is_primary, status,
    effective_from, effective_to, payment_term_summary
  )
  SELECT v_new, price_code, price_name, amount, currency, is_primary, 'active',
         effective_from, effective_to, payment_term_summary
  FROM public.product_price_options WHERE product_id = p_source_id AND status = 'active';
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'clone_product', 'products', v_new,
          jsonb_build_object('source_id', p_source_id, 'new_code', p_new_code));
  RETURN v_new;
END $function$;

CREATE OR REPLACE FUNCTION public.archive_product(p_product_id uuid, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_project uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  SELECT project_id INTO v_project FROM public.products WHERE id = p_product_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_project) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  UPDATE public.products SET archived_at = COALESCE(archived_at, now()), updated_at = now() WHERE id = p_product_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'archive_product', 'products', p_product_id, jsonb_build_object('reason', p_reason));
END $function$;

CREATE OR REPLACE FUNCTION public.restore_product(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_project uuid; v_ptype uuid; v_zone uuid; v_building uuid; v_floor uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'inactive_user' USING ERRCODE='42501'; END IF;
  SELECT project_id, product_type_id, zone_id, building_id, floor_id
    INTO v_project, v_ptype, v_zone, v_building, v_floor
    FROM public.products WHERE id = p_product_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v_project) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  PERFORM public.validate_product_relationships(v_project, v_zone, v_building, v_floor, v_ptype);
  IF EXISTS (
    SELECT 1 FROM public.product_field_definitions fd
    WHERE fd.project_id = v_project AND fd.status='active' AND fd.is_required=true
      AND (fd.product_type_id IS NULL OR fd.product_type_id = v_ptype)
      AND NOT EXISTS (SELECT 1 FROM public.product_custom_values pcv
                      WHERE pcv.product_id = p_product_id AND pcv.field_definition_id = fd.id)
  ) THEN RAISE EXCEPTION 'cannot_restore_missing_required_fields'; END IF;
  UPDATE public.products SET archived_at = NULL, updated_at = now() WHERE id = p_product_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'restore_product', 'products', p_product_id);
END $function$;

-- 8) IMPORT
CREATE OR REPLACE FUNCTION public.inventory_import_add_rows(p_job_id uuid, p_rows jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_job RECORD; v_r jsonb; v_count int := 0; v_existing int; v_codes jsonb := '{}'::jsonb; v_code text;
BEGIN
  SELECT * INTO v_job FROM public.inventory_import_jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.is_project_manager(v_job.project_id) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  IF v_job.status <> 'pending' THEN RAISE EXCEPTION 'job_not_pending'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'rows_must_be_array'; END IF;
  SELECT count(*) INTO v_existing FROM public.inventory_import_rows WHERE import_job_id = p_job_id;
  IF v_existing + jsonb_array_length(p_rows) > 5000 THEN RAISE EXCEPTION 'too_many_rows_max_5000'; END IF;
  FOR v_r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_code := v_r->>'product_code';
    IF v_code IS NULL OR length(v_code) = 0 THEN RAISE EXCEPTION 'product_code_required'; END IF;
    IF length(v_code) > 128 THEN RAISE EXCEPTION 'product_code_too_long: %', v_code; END IF;
    IF v_codes ? v_code THEN RAISE EXCEPTION 'duplicate_product_code_in_job: %', v_code; END IF;
    v_codes := v_codes || jsonb_build_object(v_code, true);
    INSERT INTO public.inventory_import_rows (import_job_id, row_number, product_code, raw_data, status)
    VALUES (p_job_id, COALESCE((v_r->>'row_number')::int, v_existing + v_count + 1),
            v_code, COALESCE(v_r->'raw_data', v_r), 'pending');
    v_count := v_count + 1;
  END LOOP;
  UPDATE public.inventory_import_jobs SET total_rows = v_existing + v_count, updated_at = now() WHERE id = p_job_id;
  RETURN v_count;
END $function$;

CREATE OR REPLACE FUNCTION public.commit_inventory_import(p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_job RECORD; v_row RECORD; v_core jsonb; v_custom_obj jsonb; v_product_id uuid; v_success int := 0;
BEGIN
  SELECT * INTO v_job FROM public.inventory_import_jobs WHERE id = p_job_id FOR UPDATE;
  IF v_job IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.is_project_manager(v_job.project_id) THEN RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501'; END IF;
  IF v_job.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'job_not_pending'; END IF;
  UPDATE public.inventory_import_jobs
     SET status = 'processing', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = p_job_id;
  FOR v_row IN SELECT * FROM public.inventory_import_rows
     WHERE import_job_id = p_job_id AND status IN ('pending','failed') ORDER BY row_number LOOP
    v_core := COALESCE(v_row.raw_data->'core', '{}'::jsonb);
    v_custom_obj := COALESCE(v_row.raw_data->'custom', '{}'::jsonb);
    SELECT id INTO v_product_id FROM public.products
     WHERE project_id = v_job.project_id AND product_code = v_row.product_code;
    IF v_product_id IS NULL THEN
      v_product_id := public.create_product_with_values(
        v_job.project_id,
        v_core || jsonb_build_object('product_code', v_row.product_code, 'inventory_source', 'import'),
        v_custom_obj, v_row.raw_data->'prices');
    ELSE
      PERFORM public.update_product_with_values(v_product_id, v_core, v_custom_obj, v_row.raw_data->'prices');
    END IF;
    UPDATE public.inventory_import_rows
       SET status='success', product_id=v_product_id,
           action = CASE WHEN v_row.product_id IS NULL THEN 'created' ELSE 'updated' END,
           error_message = NULL
     WHERE id = v_row.id;
    v_success := v_success + 1;
  END LOOP;
  UPDATE public.inventory_import_jobs
     SET status='completed', processed_rows=v_success, success_rows=v_success, failed_rows=0,
         completed_at=now(), updated_at=now() WHERE id = p_job_id;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'commit_import', 'inventory_import_jobs', p_job_id,
          jsonb_build_object('success', v_success, 'project_id', v_job.project_id));
  RETURN jsonb_build_object('success', v_success, 'failed', 0);
END $function$;

-- 9) SEARCH_INVENTORY (product_id tiebreaker + cap)
CREATE OR REPLACE FUNCTION public.search_inventory(
  p_project_id uuid DEFAULT NULL, p_query text DEFAULT NULL, p_category text DEFAULT NULL,
  p_zone_id uuid DEFAULT NULL, p_building_id uuid DEFAULT NULL, p_product_type_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL, p_floor_min integer DEFAULT NULL, p_floor_max integer DEFAULT NULL,
  p_area_min numeric DEFAULT NULL, p_area_max numeric DEFAULT NULL,
  p_price_min numeric DEFAULT NULL, p_price_max numeric DEFAULT NULL,
  p_direction text DEFAULT NULL, p_limit integer DEFAULT 30, p_offset integer DEFAULT 0
) RETURNS SETOF public.inventory_product_summary LANGUAGE sql STABLE SET search_path = public AS $function$
  SELECT s.* FROM public.inventory_product_summary s
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
    AND (p_query IS NULL OR p_query = '' OR
         lower(s.product_code) LIKE '%' || lower(p_query) || '%' OR
         lower(COALESCE(s.product_name,'')) LIKE '%' || lower(p_query) || '%')
  ORDER BY s.featured DESC, s.updated_at DESC, s.product_id
  LIMIT LEAST(COALESCE(p_limit, 30), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$function$;

-- 10) REALTIME
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='product_custom_values') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.product_custom_values';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='inventory_view_fields') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_view_fields';
  END IF;
END $$;

-- 11) PRODUCT ADMIN DETAIL
CREATE OR REPLACE FUNCTION public.get_product_admin_detail(p_product_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_project uuid; v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT project_id INTO v_project FROM public.products WHERE id = p_product_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'product_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (public.is_project_member(v_project) OR public.has_any_role(ARRAY['super_admin','admin','director'])) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'product', to_jsonb(p), 'project', to_jsonb(pr), 'zone', to_jsonb(z),
    'building', to_jsonb(b), 'floor', to_jsonb(f), 'product_type', to_jsonb(pt),
    'custom_values', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('field', to_jsonb(fd), 'value', to_jsonb(cv))
                       ORDER BY fd.display_order, fd.field_label)
      FROM public.product_custom_values cv
      JOIN public.product_field_definitions fd ON fd.id = cv.field_definition_id
      WHERE cv.product_id = p.id), '[]'::jsonb),
    'price_options', COALESCE((
      SELECT jsonb_agg(to_jsonb(po) ORDER BY po.is_primary DESC, po.amount)
      FROM public.product_price_options po WHERE po.product_id = p.id), '[]'::jsonb),
    'media', COALESCE((
      SELECT jsonb_agg(to_jsonb(m) ORDER BY m.is_primary DESC, m.display_order)
      FROM public.product_media m WHERE m.product_id = p.id), '[]'::jsonb),
    'status_history', COALESCE((
      SELECT jsonb_agg(to_jsonb(sh) ORDER BY sh.created_at DESC)
      FROM (SELECT * FROM public.product_status_history WHERE product_id = p.id ORDER BY created_at DESC LIMIT 100) sh
    ), '[]'::jsonb),
    'price_history', COALESCE((
      SELECT jsonb_agg(to_jsonb(ph) ORDER BY ph.changed_at DESC)
      FROM (SELECT * FROM public.product_price_history WHERE product_id = p.id ORDER BY changed_at DESC LIMIT 100) ph
    ), '[]'::jsonb),
    'permissions', jsonb_build_object(
      'can_manage', public.is_project_manager(v_project),
      'can_view_history', true
    )
  ) INTO v_result
  FROM public.products p
  JOIN public.projects pr ON pr.id = p.project_id
  LEFT JOIN public.project_zones z ON z.id = p.zone_id
  LEFT JOIN public.buildings b ON b.id = p.building_id
  LEFT JOIN public.floors f ON f.id = p.floor_id
  LEFT JOIN public.product_types pt ON pt.id = p.product_type_id
  WHERE p.id = p_product_id;
  RETURN v_result;
END $function$;

-- 12) PRIVILEGE HARDENING
REVOKE ALL ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.bootstrap_super_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(uuid) TO service_role;
REVOKE ALL ON FUNCTION public._apply_product_custom_values(uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._apply_product_custom_values(uuid, uuid, uuid, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public._apply_product_prices(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._apply_product_prices(uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.set_product_custom_values(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_custom_values(uuid, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.apply_inventory_template(uuid, uuid, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_inventory_template(uuid, uuid, boolean, boolean, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.snapshot_template_from_project(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.snapshot_template_from_project(uuid, text, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.inventory_import_add_rows(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.inventory_import_add_rows(uuid, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.commit_inventory_import(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commit_inventory_import(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.bulk_create_floors(uuid, uuid, integer, integer, integer[], text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_create_floors(uuid, uuid, integer, integer, integer[], text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_project_primary_contact(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_project_primary_contact(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.save_inventory_view_fields(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_inventory_view_fields(uuid, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.duplicate_inventory_view(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_inventory_view(uuid, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_default_inventory_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_default_inventory_view(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_inventory_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_inventory_view(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_product_with_values(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_product_with_values(uuid, jsonb, jsonb, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_product_with_values(uuid, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_product_with_values(uuid, jsonb, jsonb, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.clone_product(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_product(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.archive_product(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_product(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.restore_product(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_product(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_product_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_admin_detail(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.search_inventory(uuid, text, text, uuid, uuid, uuid, text, integer, integer, numeric, numeric, numeric, numeric, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_inventory(uuid, text, text, uuid, uuid, uuid, text, integer, integer, numeric, numeric, numeric, numeric, text, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_product_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_detail(uuid) TO authenticated, service_role;