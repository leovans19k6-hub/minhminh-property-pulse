
-- ============================================================
-- BƯỚC 5A — INVENTORY ENGINE SCHEMA
-- ============================================================

-- ------------------------------------------------------------
-- 1. Reserved core field keys helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_reserved_product_field_key(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_key = ANY(ARRAY[
    'id','project_id','zone_id','building_id','floor_id','product_type_id',
    'product_code','product_name','category','status','inventory_source',
    'external_code','featured','description','handover_standard','ownership_type',
    'legal_status','release_date','metadata','archived_at','created_at','updated_at',
    'land_area','construction_area','total_floor_area','frontage','depth',
    'number_of_floors','direction','construction_status',
    'carpet_area','built_up_area','floor_number','unit_type','door_direction',
    'balcony_direction','view_text','bedrooms','bathrooms'
  ]);
$$;

-- ------------------------------------------------------------
-- 2. product_field_definitions
-- ------------------------------------------------------------
CREATE TABLE public.product_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_type_id uuid REFERENCES public.product_types(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_group text,
  data_type text NOT NULL CHECK (data_type IN (
    'text','long_text','integer','decimal','boolean','date','datetime',
    'single_select','multi_select','url','phone'
  )),
  unit text,
  help_text text,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  is_filterable boolean NOT NULL DEFAULT false,
  is_sortable boolean NOT NULL DEFAULT false,
  is_searchable boolean NOT NULL DEFAULT false,
  show_in_admin_table boolean NOT NULL DEFAULT false,
  show_in_mobile_list boolean NOT NULL DEFAULT false,
  show_in_product_detail boolean NOT NULL DEFAULT true,
  show_in_form boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfd_field_key_format CHECK (field_key ~ '^[a-z][a-z0-9_]{0,62}$'),
  CONSTRAINT pfd_field_key_not_reserved CHECK (NOT public.is_reserved_product_field_key(field_key)),
  CONSTRAINT pfd_unique_project_key UNIQUE (project_id, field_key)
);

CREATE INDEX pfd_project_idx ON public.product_field_definitions(project_id);
CREATE INDEX pfd_product_type_idx ON public.product_field_definitions(product_type_id);
CREATE INDEX pfd_status_idx ON public.product_field_definitions(status);
CREATE INDEX pfd_display_order_idx ON public.product_field_definitions(project_id, display_order);
CREATE INDEX pfd_filterable_idx ON public.product_field_definitions(project_id, is_filterable) WHERE is_filterable = true;
CREATE INDEX pfd_searchable_idx ON public.product_field_definitions(project_id, is_searchable) WHERE is_searchable = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_field_definitions TO authenticated;
GRANT ALL ON public.product_field_definitions TO service_role;
ALTER TABLE public.product_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pfd_select ON public.product_field_definitions
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND (
    public.has_any_role(ARRAY['super_admin','admin','director'])
    OR public.is_project_member(project_id)
  ));

CREATE POLICY pfd_write ON public.product_field_definitions
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

CREATE TRIGGER pfd_set_updated_at BEFORE UPDATE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pfd_audit AFTER INSERT OR UPDATE OR DELETE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- Enforce product_type belongs to same project (or is global)
CREATE OR REPLACE FUNCTION public.validate_product_field_definition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pt_project uuid;
BEGIN
  IF NEW.product_type_id IS NOT NULL THEN
    SELECT project_id INTO v_pt_project FROM public.product_types WHERE id = NEW.product_type_id;
    IF v_pt_project IS NOT NULL AND v_pt_project <> NEW.project_id THEN
      RAISE EXCEPTION 'product_type_belongs_to_different_project';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER pfd_validate BEFORE INSERT OR UPDATE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_field_definition();

-- ------------------------------------------------------------
-- 3. product_field_options
-- ------------------------------------------------------------
CREATE TABLE public.product_field_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id uuid NOT NULL REFERENCES public.product_field_definitions(id) ON DELETE CASCADE,
  option_value text NOT NULL,
  option_label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pfo_unique UNIQUE (field_definition_id, option_value)
);

CREATE INDEX pfo_field_idx ON public.product_field_options(field_definition_id);
CREATE INDEX pfo_status_idx ON public.product_field_options(status);
CREATE INDEX pfo_display_order_idx ON public.product_field_options(field_definition_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_field_options TO authenticated;
GRANT ALL ON public.product_field_options TO service_role;
ALTER TABLE public.product_field_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY pfo_select ON public.product_field_options
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.product_field_definitions d
    WHERE d.id = field_definition_id
      AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_member(d.project_id))
  ));

CREATE POLICY pfo_write ON public.product_field_options
  FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.product_field_definitions d
    WHERE d.id = field_definition_id AND public.is_project_manager(d.project_id)
  ))
  WITH CHECK (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.product_field_definitions d
    WHERE d.id = field_definition_id AND public.is_project_manager(d.project_id)
  ));

CREATE TRIGGER pfo_set_updated_at BEFORE UPDATE ON public.product_field_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pfo_audit AFTER INSERT OR UPDATE OR DELETE ON public.product_field_options
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- ------------------------------------------------------------
-- 4. product_custom_values
-- ------------------------------------------------------------
CREATE TABLE public.product_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_definition_id uuid NOT NULL REFERENCES public.product_field_definitions(id) ON DELETE CASCADE,
  value_text text,
  value_integer bigint,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_datetime timestamptz,
  value_jsonb jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcv_unique UNIQUE (product_id, field_definition_id)
);

CREATE INDEX pcv_product_idx ON public.product_custom_values(product_id);
CREATE INDEX pcv_field_idx ON public.product_custom_values(field_definition_id);
CREATE INDEX pcv_value_text_idx ON public.product_custom_values(field_definition_id, value_text) WHERE value_text IS NOT NULL;
CREATE INDEX pcv_value_integer_idx ON public.product_custom_values(field_definition_id, value_integer) WHERE value_integer IS NOT NULL;
CREATE INDEX pcv_value_decimal_idx ON public.product_custom_values(field_definition_id, value_decimal) WHERE value_decimal IS NOT NULL;
CREATE INDEX pcv_value_boolean_idx ON public.product_custom_values(field_definition_id, value_boolean) WHERE value_boolean IS NOT NULL;
CREATE INDEX pcv_value_date_idx ON public.product_custom_values(field_definition_id, value_date) WHERE value_date IS NOT NULL;
CREATE INDEX pcv_value_datetime_idx ON public.product_custom_values(field_definition_id, value_datetime) WHERE value_datetime IS NOT NULL;

GRANT SELECT ON public.product_custom_values TO authenticated;
GRANT ALL ON public.product_custom_values TO service_role;
ALTER TABLE public.product_custom_values ENABLE ROW LEVEL SECURITY;

-- READ policy scoped to project membership via product join
CREATE POLICY pcv_select ON public.product_custom_values
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
      AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_member(p.project_id))
  ));

-- WRITE only via SECURITY DEFINER RPCs (phase 5C) — no direct client writes.
-- service_role bypasses RLS anyway.

CREATE TRIGGER pcv_set_updated_at BEFORE UPDATE ON public.product_custom_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validate typed value column matches data_type, and cross-project scope
CREATE OR REPLACE FUNCTION public.validate_product_custom_value()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_field record;
  v_product record;
  v_populated_count int := 0;
  v_expected_col text;
  v_val text;
  v_arr jsonb;
BEGIN
  SELECT project_id, product_type_id, data_type, status
    INTO v_field
    FROM public.product_field_definitions
   WHERE id = NEW.field_definition_id;
  IF v_field IS NULL THEN RAISE EXCEPTION 'field_definition_not_found'; END IF;
  IF v_field.status <> 'active' THEN RAISE EXCEPTION 'field_definition_not_active'; END IF;

  SELECT project_id, product_type_id
    INTO v_product
    FROM public.products
   WHERE id = NEW.product_id;
  IF v_product IS NULL THEN RAISE EXCEPTION 'product_not_found'; END IF;

  IF v_product.project_id <> v_field.project_id THEN
    RAISE EXCEPTION 'field_and_product_belong_to_different_projects';
  END IF;
  IF v_field.product_type_id IS NOT NULL AND v_field.product_type_id IS DISTINCT FROM v_product.product_type_id THEN
    RAISE EXCEPTION 'field_not_applicable_to_product_type';
  END IF;

  -- Determine expected column and validate exclusivity
  v_expected_col := CASE v_field.data_type
    WHEN 'text' THEN 'value_text'
    WHEN 'long_text' THEN 'value_text'
    WHEN 'url' THEN 'value_text'
    WHEN 'phone' THEN 'value_text'
    WHEN 'single_select' THEN 'value_text'
    WHEN 'integer' THEN 'value_integer'
    WHEN 'decimal' THEN 'value_decimal'
    WHEN 'boolean' THEN 'value_boolean'
    WHEN 'date' THEN 'value_date'
    WHEN 'datetime' THEN 'value_datetime'
    WHEN 'multi_select' THEN 'value_jsonb'
  END;

  IF NEW.value_text IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_integer IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_decimal IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_boolean IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_date IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_datetime IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;
  IF NEW.value_jsonb IS NOT NULL THEN v_populated_count := v_populated_count + 1; END IF;

  IF v_populated_count = 0 THEN
    RAISE EXCEPTION 'custom_value_must_have_one_typed_value';
  END IF;
  IF v_populated_count > 1 THEN
    RAISE EXCEPTION 'custom_value_must_have_exactly_one_typed_value';
  END IF;

  -- Check the populated column matches expected
  IF v_expected_col = 'value_text' AND NEW.value_text IS NULL THEN
    RAISE EXCEPTION 'expected_value_text_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_integer' AND NEW.value_integer IS NULL THEN
    RAISE EXCEPTION 'expected_value_integer_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_decimal' AND NEW.value_decimal IS NULL THEN
    RAISE EXCEPTION 'expected_value_decimal_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_boolean' AND NEW.value_boolean IS NULL THEN
    RAISE EXCEPTION 'expected_value_boolean_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_date' AND NEW.value_date IS NULL THEN
    RAISE EXCEPTION 'expected_value_date_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_datetime' AND NEW.value_datetime IS NULL THEN
    RAISE EXCEPTION 'expected_value_datetime_for_data_type_%', v_field.data_type;
  ELSIF v_expected_col = 'value_jsonb' AND NEW.value_jsonb IS NULL THEN
    RAISE EXCEPTION 'expected_value_jsonb_for_data_type_%', v_field.data_type;
  END IF;

  -- Select option validation
  IF v_field.data_type = 'single_select' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.product_field_options
       WHERE field_definition_id = NEW.field_definition_id
         AND option_value = NEW.value_text
         AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'invalid_single_select_option: %', NEW.value_text;
    END IF;
  ELSIF v_field.data_type = 'multi_select' THEN
    IF jsonb_typeof(NEW.value_jsonb) <> 'array' THEN
      RAISE EXCEPTION 'multi_select_value_must_be_json_array';
    END IF;
    FOR v_val IN SELECT jsonb_array_elements_text(NEW.value_jsonb) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.product_field_options
         WHERE field_definition_id = NEW.field_definition_id
           AND option_value = v_val
           AND status = 'active'
      ) THEN
        RAISE EXCEPTION 'invalid_multi_select_option: %', v_val;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER pcv_validate BEFORE INSERT OR UPDATE ON public.product_custom_values
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_custom_value();

-- Guard: prevent changing field_key once values exist (immutability)
CREATE OR REPLACE FUNCTION public.guard_product_field_key_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.field_key IS DISTINCT FROM OLD.field_key THEN
    IF EXISTS (SELECT 1 FROM public.product_custom_values WHERE field_definition_id = NEW.id) THEN
      RAISE EXCEPTION 'field_key_immutable_once_values_exist';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER pfd_guard_key BEFORE UPDATE ON public.product_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.guard_product_field_key_immutable();

-- Guard: prevent changing option_value if used
CREATE OR REPLACE FUNCTION public.guard_product_field_option_value_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_data_type text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.option_value IS DISTINCT FROM OLD.option_value THEN
    SELECT data_type INTO v_data_type FROM public.product_field_definitions WHERE id = NEW.field_definition_id;
    IF v_data_type = 'single_select' THEN
      IF EXISTS (SELECT 1 FROM public.product_custom_values
                  WHERE field_definition_id = NEW.field_definition_id
                    AND value_text = OLD.option_value) THEN
        RAISE EXCEPTION 'option_value_immutable_once_used';
      END IF;
    ELSIF v_data_type = 'multi_select' THEN
      IF EXISTS (SELECT 1 FROM public.product_custom_values
                  WHERE field_definition_id = NEW.field_definition_id
                    AND value_jsonb ? OLD.option_value) THEN
        RAISE EXCEPTION 'option_value_immutable_once_used';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER pfo_guard_value BEFORE UPDATE ON public.product_field_options
  FOR EACH ROW EXECUTE FUNCTION public.guard_product_field_option_value_immutable();

-- ------------------------------------------------------------
-- 5. inventory_views
-- ------------------------------------------------------------
CREATE TABLE public.inventory_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  view_type text NOT NULL CHECK (view_type IN ('admin_table','mobile_list','mobile_detail','custom')),
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  default_sort_field text,
  default_sort_direction text NOT NULL DEFAULT 'asc' CHECK (default_sort_direction IN ('asc','desc')),
  page_size integer NOT NULL DEFAULT 30 CHECK (page_size BETWEEN 1 AND 200),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iv_unique_project_code UNIQUE (project_id, code),
  CONSTRAINT iv_code_format CHECK (code ~ '^[a-z][a-z0-9_]{0,62}$')
);

CREATE INDEX iv_project_idx ON public.inventory_views(project_id);
CREATE INDEX iv_view_type_idx ON public.inventory_views(project_id, view_type);
-- Partial unique: only one active default per (project, view_type)
CREATE UNIQUE INDEX iv_default_per_type_idx
  ON public.inventory_views(project_id, view_type)
  WHERE is_default = true AND status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_views TO authenticated;
GRANT ALL ON public.inventory_views TO service_role;
ALTER TABLE public.inventory_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY iv_select ON public.inventory_views
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND (
    public.has_any_role(ARRAY['super_admin','admin','director'])
    OR public.is_project_member(project_id)
  ));

CREATE POLICY iv_write ON public.inventory_views
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

CREATE TRIGGER iv_set_updated_at BEFORE UPDATE ON public.inventory_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER iv_audit AFTER INSERT OR UPDATE OR DELETE ON public.inventory_views
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- ------------------------------------------------------------
-- 6. inventory_view_fields
-- ------------------------------------------------------------
CREATE TABLE public.inventory_view_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_view_id uuid NOT NULL REFERENCES public.inventory_views(id) ON DELETE CASCADE,
  field_source text NOT NULL CHECK (field_source IN ('core','custom','price')),
  core_field_key text,
  field_definition_id uuid REFERENCES public.product_field_definitions(id) ON DELETE CASCADE,
  price_code text,
  column_label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  width integer,
  visible boolean NOT NULL DEFAULT true,
  pinned text CHECK (pinned IN ('left','right')),
  sortable boolean NOT NULL DEFAULT false,
  filterable boolean NOT NULL DEFAULT false,
  searchable boolean NOT NULL DEFAULT false,
  mobile_visible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ivf_source_ref CHECK (
    (field_source = 'core' AND core_field_key IS NOT NULL AND field_definition_id IS NULL AND price_code IS NULL) OR
    (field_source = 'custom' AND field_definition_id IS NOT NULL AND core_field_key IS NULL AND price_code IS NULL) OR
    (field_source = 'price' AND price_code IS NOT NULL AND core_field_key IS NULL AND field_definition_id IS NULL)
  )
);

CREATE INDEX ivf_view_idx ON public.inventory_view_fields(inventory_view_id, display_order);
CREATE UNIQUE INDEX ivf_unique_core ON public.inventory_view_fields(inventory_view_id, core_field_key) WHERE field_source = 'core';
CREATE UNIQUE INDEX ivf_unique_custom ON public.inventory_view_fields(inventory_view_id, field_definition_id) WHERE field_source = 'custom';
CREATE UNIQUE INDEX ivf_unique_price ON public.inventory_view_fields(inventory_view_id, price_code) WHERE field_source = 'price';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_view_fields TO authenticated;
GRANT ALL ON public.inventory_view_fields TO service_role;
ALTER TABLE public.inventory_view_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY ivf_select ON public.inventory_view_fields
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.inventory_views v
    WHERE v.id = inventory_view_id
      AND (public.has_any_role(ARRAY['super_admin','admin','director']) OR public.is_project_member(v.project_id))
  ));

CREATE POLICY ivf_write ON public.inventory_view_fields
  FOR ALL TO authenticated
  USING (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.inventory_views v
    WHERE v.id = inventory_view_id AND public.is_project_manager(v.project_id)
  ))
  WITH CHECK (public.is_active_user() AND EXISTS (
    SELECT 1 FROM public.inventory_views v
    WHERE v.id = inventory_view_id AND public.is_project_manager(v.project_id)
  ));

CREATE TRIGGER ivf_set_updated_at BEFORE UPDATE ON public.inventory_view_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ivf_audit AFTER INSERT OR UPDATE OR DELETE ON public.inventory_view_fields
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- Validate view/field project scope + core_field_key is real core field
CREATE OR REPLACE FUNCTION public.validate_inventory_view_field()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_view_project uuid; v_field_project uuid;
BEGIN
  SELECT project_id INTO v_view_project FROM public.inventory_views WHERE id = NEW.inventory_view_id;
  IF v_view_project IS NULL THEN RAISE EXCEPTION 'inventory_view_not_found'; END IF;

  IF NEW.field_source = 'core' THEN
    IF NOT public.is_reserved_product_field_key(NEW.core_field_key) THEN
      RAISE EXCEPTION 'unknown_core_field_key: %', NEW.core_field_key;
    END IF;
  ELSIF NEW.field_source = 'custom' THEN
    SELECT project_id INTO v_field_project FROM public.product_field_definitions WHERE id = NEW.field_definition_id;
    IF v_field_project IS NULL THEN RAISE EXCEPTION 'field_definition_not_found'; END IF;
    IF v_field_project <> v_view_project THEN
      RAISE EXCEPTION 'field_definition_belongs_to_different_project';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER ivf_validate BEFORE INSERT OR UPDATE ON public.inventory_view_fields
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_view_field();

-- ------------------------------------------------------------
-- 7. project_inventory_settings
-- ------------------------------------------------------------
CREATE TABLE public.project_inventory_settings (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  default_admin_view_id uuid REFERENCES public.inventory_views(id) ON DELETE SET NULL,
  default_mobile_view_id uuid REFERENCES public.inventory_views(id) ON DELETE SET NULL,
  allow_custom_fields boolean NOT NULL DEFAULT true,
  allow_product_clone boolean NOT NULL DEFAULT true,
  allow_bulk_edit boolean NOT NULL DEFAULT true,
  allow_bulk_status_update boolean NOT NULL DEFAULT true,
  allow_bulk_price_update boolean NOT NULL DEFAULT true,
  realtime_enabled boolean NOT NULL DEFAULT true,
  inventory_display_name text NOT NULL DEFAULT 'Bảng hàng',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_inventory_settings TO authenticated;
GRANT ALL ON public.project_inventory_settings TO service_role;
ALTER TABLE public.project_inventory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pis_select ON public.project_inventory_settings
  FOR SELECT TO authenticated
  USING (public.is_active_user() AND (
    public.has_any_role(ARRAY['super_admin','admin','director'])
    OR public.is_project_member(project_id)
  ));

CREATE POLICY pis_write ON public.project_inventory_settings
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.is_project_manager(project_id))
  WITH CHECK (public.is_active_user() AND public.is_project_manager(project_id));

CREATE TRIGGER pis_set_updated_at BEFORE UPDATE ON public.project_inventory_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pis_audit AFTER INSERT OR UPDATE OR DELETE ON public.project_inventory_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- Validate default views belong to same project
CREATE OR REPLACE FUNCTION public.validate_project_inventory_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_p uuid;
BEGIN
  IF NEW.default_admin_view_id IS NOT NULL THEN
    SELECT project_id INTO v_p FROM public.inventory_views WHERE id = NEW.default_admin_view_id;
    IF v_p IS NULL OR v_p <> NEW.project_id THEN RAISE EXCEPTION 'default_admin_view_wrong_project'; END IF;
  END IF;
  IF NEW.default_mobile_view_id IS NOT NULL THEN
    SELECT project_id INTO v_p FROM public.inventory_views WHERE id = NEW.default_mobile_view_id;
    IF v_p IS NULL OR v_p <> NEW.project_id THEN RAISE EXCEPTION 'default_mobile_view_wrong_project'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER pis_validate BEFORE INSERT OR UPDATE ON public.project_inventory_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_project_inventory_settings();

-- ------------------------------------------------------------
-- 8. inventory_templates
-- ------------------------------------------------------------
CREATE TABLE public.inventory_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  project_category text,
  source_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT it_code_format CHECK (code ~ '^[a-z][a-z0-9_]{0,62}$')
);

CREATE INDEX it_status_idx ON public.inventory_templates(status);
CREATE INDEX it_category_idx ON public.inventory_templates(project_category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_templates TO authenticated;
GRANT ALL ON public.inventory_templates TO service_role;
ALTER TABLE public.inventory_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY it_select ON public.inventory_templates
  FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY it_write ON public.inventory_templates
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']))
  WITH CHECK (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']));

CREATE TRIGGER it_set_updated_at BEFORE UPDATE ON public.inventory_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER it_audit AFTER INSERT OR UPDATE OR DELETE ON public.inventory_templates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_changes();

-- ------------------------------------------------------------
-- 9. inventory_template_fields
-- ------------------------------------------------------------
CREATE TABLE public.inventory_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.inventory_templates(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_label text NOT NULL,
  field_group text,
  data_type text NOT NULL CHECK (data_type IN (
    'text','long_text','integer','decimal','boolean','date','datetime',
    'single_select','multi_select','url','phone'
  )),
  unit text,
  help_text text,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  is_filterable boolean NOT NULL DEFAULT false,
  is_sortable boolean NOT NULL DEFAULT false,
  is_searchable boolean NOT NULL DEFAULT false,
  show_in_admin_table boolean NOT NULL DEFAULT false,
  show_in_mobile_list boolean NOT NULL DEFAULT false,
  show_in_product_detail boolean NOT NULL DEFAULT true,
  show_in_form boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itf_unique UNIQUE (template_id, field_key),
  CONSTRAINT itf_field_key_format CHECK (field_key ~ '^[a-z][a-z0-9_]{0,62}$')
);

CREATE INDEX itf_template_idx ON public.inventory_template_fields(template_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_template_fields TO authenticated;
GRANT ALL ON public.inventory_template_fields TO service_role;
ALTER TABLE public.inventory_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY itf_select ON public.inventory_template_fields
  FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY itf_write ON public.inventory_template_fields
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']))
  WITH CHECK (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']));

CREATE TRIGGER itf_set_updated_at BEFORE UPDATE ON public.inventory_template_fields
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- 10. inventory_template_views
-- ------------------------------------------------------------
CREATE TABLE public.inventory_template_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.inventory_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  view_type text NOT NULL CHECK (view_type IN ('admin_table','mobile_list','mobile_detail','custom')),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT itv_unique UNIQUE (template_id, code),
  CONSTRAINT itv_code_format CHECK (code ~ '^[a-z][a-z0-9_]{0,62}$')
);

CREATE INDEX itv_template_idx ON public.inventory_template_views(template_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_template_views TO authenticated;
GRANT ALL ON public.inventory_template_views TO service_role;
ALTER TABLE public.inventory_template_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY itv_select ON public.inventory_template_views
  FOR SELECT TO authenticated
  USING (public.is_active_user());

CREATE POLICY itv_write ON public.inventory_template_views
  FOR ALL TO authenticated
  USING (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']))
  WITH CHECK (public.is_active_user() AND public.has_any_role(ARRAY['super_admin','admin']));

CREATE TRIGGER itv_set_updated_at BEFORE UPDATE ON public.inventory_template_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
