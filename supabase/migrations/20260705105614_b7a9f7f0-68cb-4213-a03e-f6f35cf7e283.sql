
-- Phase 5D — Template application, import commit, snapshot helpers.

-- ============================================================
-- 1) apply_inventory_template
--   Copy template_fields → product_field_definitions + product_field_options
--   Copy template_views  → inventory_views + inventory_view_fields
--   Idempotent: by (project_id, field_key) and (project_id, code).
--   p_overwrite=false: skip existing keys/codes; true: update.
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_inventory_template(
  p_template_id uuid,
  p_project_id uuid,
  p_overwrite boolean DEFAULT false,
  p_include_fields boolean DEFAULT true,
  p_include_views boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl RECORD;
  v_tf  RECORD;
  v_tv  RECORD;
  v_field_id uuid;
  v_view_id  uuid;
  v_opt jsonb;
  v_col jsonb;
  v_fields_created int := 0;
  v_fields_updated int := 0;
  v_fields_skipped int := 0;
  v_views_created int := 0;
  v_views_updated int := 0;
  v_views_skipped int := 0;
BEGIN
  IF NOT public.is_project_manager(p_project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_tpl FROM public.inventory_templates WHERE id = p_template_id;
  IF v_tpl IS NULL THEN
    RAISE EXCEPTION 'template_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_tpl.status <> 'active' THEN
    RAISE EXCEPTION 'template_not_active';
  END IF;

  -- ---------- FIELDS ----------
  IF p_include_fields THEN
    FOR v_tf IN
      SELECT * FROM public.inventory_template_fields
       WHERE template_id = p_template_id
       ORDER BY display_order, field_label
    LOOP
      -- Skip reserved core keys defensively
      IF public.is_reserved_product_field_key(v_tf.field_key) THEN
        v_fields_skipped := v_fields_skipped + 1;
        CONTINUE;
      END IF;

      SELECT id INTO v_field_id
        FROM public.product_field_definitions
       WHERE project_id = p_project_id AND field_key = v_tf.field_key;

      IF v_field_id IS NULL THEN
        INSERT INTO public.product_field_definitions (
          project_id, product_type_id, field_key, field_label, field_group, data_type,
          unit, help_text, placeholder, is_required, is_filterable, is_sortable, is_searchable,
          show_in_admin_table, show_in_mobile_list, show_in_product_detail, show_in_form,
          display_order, validation_rules, metadata, status
        ) VALUES (
          p_project_id, NULL, v_tf.field_key, v_tf.field_label, v_tf.field_group, v_tf.data_type,
          v_tf.unit, v_tf.help_text, v_tf.placeholder, v_tf.is_required, v_tf.is_filterable,
          v_tf.is_sortable, v_tf.is_searchable, v_tf.show_in_admin_table, v_tf.show_in_mobile_list,
          v_tf.show_in_product_detail, v_tf.show_in_form, v_tf.display_order,
          v_tf.validation_rules, v_tf.metadata, 'active'
        )
        RETURNING id INTO v_field_id;
        v_fields_created := v_fields_created + 1;
      ELSIF p_overwrite THEN
        UPDATE public.product_field_definitions SET
          field_label = v_tf.field_label,
          field_group = v_tf.field_group,
          -- data_type immutable in practice; only change if no values yet
          data_type   = CASE WHEN EXISTS (SELECT 1 FROM public.product_custom_values WHERE field_definition_id = v_field_id)
                             THEN data_type ELSE v_tf.data_type END,
          unit = v_tf.unit,
          help_text = v_tf.help_text,
          placeholder = v_tf.placeholder,
          is_required = v_tf.is_required,
          is_filterable = v_tf.is_filterable,
          is_sortable = v_tf.is_sortable,
          is_searchable = v_tf.is_searchable,
          show_in_admin_table = v_tf.show_in_admin_table,
          show_in_mobile_list = v_tf.show_in_mobile_list,
          show_in_product_detail = v_tf.show_in_product_detail,
          show_in_form = v_tf.show_in_form,
          display_order = v_tf.display_order,
          validation_rules = v_tf.validation_rules,
          metadata = v_tf.metadata,
          updated_at = now()
        WHERE id = v_field_id;
        v_fields_updated := v_fields_updated + 1;
      ELSE
        v_fields_skipped := v_fields_skipped + 1;
      END IF;

      -- Options (for select types)
      IF v_tf.data_type IN ('single_select','multi_select')
         AND v_tf.options IS NOT NULL
         AND jsonb_typeof(v_tf.options) = 'array' THEN
        FOR v_opt IN SELECT * FROM jsonb_array_elements(v_tf.options) LOOP
          INSERT INTO public.product_field_options (
            field_definition_id, option_value, option_label, display_order, status, metadata
          ) VALUES (
            v_field_id,
            v_opt->>'value',
            COALESCE(v_opt->>'label', v_opt->>'value'),
            COALESCE((v_opt->>'display_order')::int, 0),
            COALESCE(v_opt->>'status','active'),
            COALESCE(v_opt->'metadata','{}'::jsonb)
          )
          ON CONFLICT (field_definition_id, option_value) DO UPDATE
            SET option_label = CASE WHEN p_overwrite THEN EXCLUDED.option_label ELSE public.product_field_options.option_label END,
                display_order = CASE WHEN p_overwrite THEN EXCLUDED.display_order ELSE public.product_field_options.display_order END,
                updated_at = now();
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- ---------- VIEWS ----------
  IF p_include_views THEN
    FOR v_tv IN
      SELECT * FROM public.inventory_template_views
       WHERE template_id = p_template_id
       ORDER BY display_order, name
    LOOP
      SELECT id INTO v_view_id
        FROM public.inventory_views
       WHERE project_id = p_project_id AND code = v_tv.code;

      IF v_view_id IS NULL THEN
        INSERT INTO public.inventory_views (
          project_id, name, code, description, view_type, status,
          default_sort_field, default_sort_direction, page_size, is_default
        ) VALUES (
          p_project_id, v_tv.name, v_tv.code,
          v_tv.configuration->>'description',
          v_tv.view_type, 'active',
          v_tv.configuration->>'default_sort_field',
          COALESCE(v_tv.configuration->>'default_sort_direction','desc'),
          COALESCE((v_tv.configuration->>'page_size')::int, 30),
          COALESCE((v_tv.configuration->>'is_default')::boolean, false)
        )
        RETURNING id INTO v_view_id;
        v_views_created := v_views_created + 1;
      ELSIF p_overwrite THEN
        UPDATE public.inventory_views SET
          name = v_tv.name,
          view_type = v_tv.view_type,
          updated_at = now()
        WHERE id = v_view_id;
        -- Wipe existing columns for clean replace
        DELETE FROM public.inventory_view_fields WHERE inventory_view_id = v_view_id;
        v_views_updated := v_views_updated + 1;
      ELSE
        v_views_skipped := v_views_skipped + 1;
        CONTINUE;
      END IF;

      -- Insert columns from configuration.columns
      IF v_tv.configuration ? 'columns' AND jsonb_typeof(v_tv.configuration->'columns') = 'array' THEN
        FOR v_col IN SELECT * FROM jsonb_array_elements(v_tv.configuration->'columns') LOOP
          -- resolve field_definition_id by field_key if source=custom
          IF (v_col->>'field_source') = 'custom' THEN
            SELECT id INTO v_field_id
              FROM public.product_field_definitions
             WHERE project_id = p_project_id AND field_key = v_col->>'field_key';
            IF v_field_id IS NULL THEN CONTINUE; END IF;
            INSERT INTO public.inventory_view_fields (
              inventory_view_id, field_source, field_definition_id, column_label,
              display_order, width, visible, pinned, sortable, filterable, searchable, mobile_visible
            ) VALUES (
              v_view_id, 'custom', v_field_id,
              COALESCE(v_col->>'column_label', v_col->>'field_key'),
              COALESCE((v_col->>'display_order')::int, 0),
              NULLIF(v_col->>'width','')::int,
              COALESCE((v_col->>'visible')::boolean, true),
              v_col->>'pinned',
              COALESCE((v_col->>'sortable')::boolean, false),
              COALESCE((v_col->>'filterable')::boolean, false),
              COALESCE((v_col->>'searchable')::boolean, false),
              COALESCE((v_col->>'mobile_visible')::boolean, false)
            )
            ON CONFLICT DO NOTHING;
          ELSIF (v_col->>'field_source') = 'core' THEN
            INSERT INTO public.inventory_view_fields (
              inventory_view_id, field_source, core_field_key, column_label,
              display_order, width, visible, pinned, sortable, filterable, searchable, mobile_visible
            ) VALUES (
              v_view_id, 'core', v_col->>'core_field_key',
              COALESCE(v_col->>'column_label', v_col->>'core_field_key'),
              COALESCE((v_col->>'display_order')::int, 0),
              NULLIF(v_col->>'width','')::int,
              COALESCE((v_col->>'visible')::boolean, true),
              v_col->>'pinned',
              COALESCE((v_col->>'sortable')::boolean, false),
              COALESCE((v_col->>'filterable')::boolean, false),
              COALESCE((v_col->>'searchable')::boolean, false),
              COALESCE((v_col->>'mobile_visible')::boolean, false)
            )
            ON CONFLICT DO NOTHING;
          ELSIF (v_col->>'field_source') = 'price' THEN
            INSERT INTO public.inventory_view_fields (
              inventory_view_id, field_source, price_code, column_label,
              display_order, width, visible, pinned, sortable, filterable, searchable, mobile_visible
            ) VALUES (
              v_view_id, 'price', COALESCE(v_col->>'price_code','primary'),
              COALESCE(v_col->>'column_label','Giá'),
              COALESCE((v_col->>'display_order')::int, 0),
              NULLIF(v_col->>'width','')::int,
              COALESCE((v_col->>'visible')::boolean, true),
              v_col->>'pinned',
              COALESCE((v_col->>'sortable')::boolean, false),
              COALESCE((v_col->>'filterable')::boolean, false),
              COALESCE((v_col->>'searchable')::boolean, false),
              COALESCE((v_col->>'mobile_visible')::boolean, false)
            )
            ON CONFLICT DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'apply_template', 'inventory_templates', p_template_id,
          jsonb_build_object('project_id', p_project_id,
                             'fields_created', v_fields_created,
                             'fields_updated', v_fields_updated,
                             'fields_skipped', v_fields_skipped,
                             'views_created', v_views_created,
                             'views_updated', v_views_updated,
                             'views_skipped', v_views_skipped,
                             'overwrite', p_overwrite));

  RETURN jsonb_build_object(
    'fields_created', v_fields_created,
    'fields_updated', v_fields_updated,
    'fields_skipped', v_fields_skipped,
    'views_created', v_views_created,
    'views_updated', v_views_updated,
    'views_skipped', v_views_skipped
  );
END $$;

-- ============================================================
-- 2) snapshot_template_from_project — reverse: create template from a project.
--    Captures active fields + views into inventory_template_fields/_views.
-- ============================================================
CREATE OR REPLACE FUNCTION public.snapshot_template_from_project(
  p_project_id uuid,
  p_code text,
  p_name text,
  p_description text DEFAULT NULL,
  p_project_category text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl_id uuid;
  v_fd RECORD;
  v_vw RECORD;
  v_cols jsonb;
  v_opts jsonb;
BEGIN
  IF NOT public.has_any_role(ARRAY['super_admin','admin']) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.inventory_templates (name, code, description, project_category, source_project_id, created_by, is_system)
  VALUES (p_name, p_code, p_description, p_project_category, p_project_id, auth.uid(), false)
  RETURNING id INTO v_tpl_id;

  FOR v_fd IN
    SELECT * FROM public.product_field_definitions
     WHERE project_id = p_project_id AND status = 'active'
     ORDER BY display_order, field_label
  LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'value', option_value, 'label', option_label,
      'display_order', display_order, 'status', status
    ) ORDER BY display_order), '[]'::jsonb)
      INTO v_opts
      FROM public.product_field_options
     WHERE field_definition_id = v_fd.id AND status = 'active';

    INSERT INTO public.inventory_template_fields (
      template_id, field_key, field_label, field_group, data_type, unit, help_text, placeholder,
      is_required, is_filterable, is_sortable, is_searchable,
      show_in_admin_table, show_in_mobile_list, show_in_product_detail, show_in_form,
      display_order, validation_rules, options, metadata
    ) VALUES (
      v_tpl_id, v_fd.field_key, v_fd.field_label, v_fd.field_group, v_fd.data_type, v_fd.unit,
      v_fd.help_text, v_fd.placeholder, v_fd.is_required, v_fd.is_filterable, v_fd.is_sortable,
      v_fd.is_searchable, v_fd.show_in_admin_table, v_fd.show_in_mobile_list,
      v_fd.show_in_product_detail, v_fd.show_in_form, v_fd.display_order,
      v_fd.validation_rules, v_opts, v_fd.metadata
    );
  END LOOP;

  FOR v_vw IN
    SELECT * FROM public.inventory_views
     WHERE project_id = p_project_id AND status = 'active'
     ORDER BY view_type, name
  LOOP
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'field_source', vf.field_source,
      'core_field_key', vf.core_field_key,
      'field_key', fd.field_key,
      'price_code', vf.price_code,
      'column_label', vf.column_label,
      'display_order', vf.display_order,
      'width', vf.width,
      'visible', vf.visible,
      'pinned', vf.pinned,
      'sortable', vf.sortable,
      'filterable', vf.filterable,
      'searchable', vf.searchable,
      'mobile_visible', vf.mobile_visible
    ) ORDER BY vf.display_order), '[]'::jsonb)
      INTO v_cols
      FROM public.inventory_view_fields vf
      LEFT JOIN public.product_field_definitions fd ON fd.id = vf.field_definition_id
     WHERE vf.inventory_view_id = v_vw.id;

    INSERT INTO public.inventory_template_views (
      template_id, name, code, view_type, display_order, configuration
    ) VALUES (
      v_tpl_id, v_vw.name, v_vw.code, v_vw.view_type, 0,
      jsonb_build_object(
        'description', v_vw.description,
        'default_sort_field', v_vw.default_sort_field,
        'default_sort_direction', v_vw.default_sort_direction,
        'page_size', v_vw.page_size,
        'is_default', v_vw.is_default,
        'columns', v_cols
      )
    );
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'snapshot_template', 'inventory_templates', v_tpl_id,
          jsonb_build_object('source_project_id', p_project_id));

  RETURN v_tpl_id;
END $$;

-- ============================================================
-- 3) inventory_import_add_rows — bulk load parsed rows from client
-- ============================================================
CREATE OR REPLACE FUNCTION public.inventory_import_add_rows(
  p_job_id uuid,
  p_rows jsonb  -- array of {row_number:int, product_code:text, raw_data:jsonb}
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_r jsonb;
  v_count int := 0;
BEGIN
  SELECT * INTO v_job FROM public.inventory_import_jobs WHERE id = p_job_id;
  IF v_job IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.is_project_manager(v_job.project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF v_job.status <> 'pending' THEN RAISE EXCEPTION 'job_not_pending'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'rows_must_be_array'; END IF;

  FOR v_r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    INSERT INTO public.inventory_import_rows (import_job_id, row_number, product_code, raw_data, status)
    VALUES (p_job_id,
            COALESCE((v_r->>'row_number')::int, v_count + 1),
            v_r->>'product_code',
            COALESCE(v_r->'raw_data', v_r),
            'pending');
    v_count := v_count + 1;
  END LOOP;

  UPDATE public.inventory_import_jobs
     SET total_rows = v_count, updated_at = now()
   WHERE id = p_job_id;

  RETURN v_count;
END $$;

-- ============================================================
-- 4) commit_inventory_import — process pending rows
--    Upsert products by (project_id, product_code); write custom values via raw_data.custom
--    raw_data schema:
--      { core: {product_name, category, status, ...}, custom: [{field_key, value_text|value_integer|...}] }
-- ============================================================
CREATE OR REPLACE FUNCTION public.commit_inventory_import(
  p_job_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_row RECORD;
  v_core jsonb;
  v_custom jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_field_id uuid;
  v_field record;
  v_success int := 0;
  v_failed int := 0;
BEGIN
  SELECT * INTO v_job FROM public.inventory_import_jobs WHERE id = p_job_id FOR UPDATE;
  IF v_job IS NULL THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.is_project_manager(v_job.project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF v_job.status NOT IN ('pending','processing') THEN
    RAISE EXCEPTION 'job_not_pending';
  END IF;

  UPDATE public.inventory_import_jobs
     SET status = 'processing', started_at = COALESCE(started_at, now()), updated_at = now()
   WHERE id = p_job_id;

  FOR v_row IN
    SELECT * FROM public.inventory_import_rows
     WHERE import_job_id = p_job_id AND status IN ('pending','failed')
     ORDER BY row_number
  LOOP
    BEGIN
      IF v_row.product_code IS NULL OR length(trim(v_row.product_code)) = 0 THEN
        RAISE EXCEPTION 'product_code_required';
      END IF;

      v_core := COALESCE(v_row.raw_data->'core', '{}'::jsonb);
      v_custom := COALESCE(v_row.raw_data->'custom', '[]'::jsonb);

      -- Upsert product on (project_id, product_code)
      SELECT id INTO v_product_id
        FROM public.products
       WHERE project_id = v_job.project_id AND product_code = v_row.product_code;

      IF v_product_id IS NULL THEN
        INSERT INTO public.products (
          project_id, product_code, product_name, category, status,
          product_type_id, zone_id, building_id, floor_id,
          featured, description, inventory_source, external_code
        ) VALUES (
          v_job.project_id, v_row.product_code,
          COALESCE(v_core->>'product_name', v_row.product_code),
          COALESCE(v_core->>'category', 'apartment'),
          COALESCE(v_core->>'status', 'available'),
          NULLIF(v_core->>'product_type_id','')::uuid,
          NULLIF(v_core->>'zone_id','')::uuid,
          NULLIF(v_core->>'building_id','')::uuid,
          NULLIF(v_core->>'floor_id','')::uuid,
          COALESCE((v_core->>'featured')::boolean, false),
          v_core->>'description',
          'import',
          v_core->>'external_code'
        )
        RETURNING id INTO v_product_id;
      ELSE
        UPDATE public.products SET
          product_name = COALESCE(v_core->>'product_name', product_name),
          category     = COALESCE(v_core->>'category', category),
          status       = COALESCE(v_core->>'status', status),
          featured     = COALESCE((v_core->>'featured')::boolean, featured),
          description  = COALESCE(v_core->>'description', description),
          external_code = COALESCE(v_core->>'external_code', external_code),
          updated_at = now()
        WHERE id = v_product_id;
      END IF;

      -- Custom values
      IF jsonb_typeof(v_custom) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_custom) LOOP
          SELECT id, data_type INTO v_field
            FROM public.product_field_definitions
           WHERE project_id = v_job.project_id
             AND field_key = v_item->>'field_key'
             AND status = 'active';
          IF v_field.id IS NULL THEN CONTINUE; END IF;

          INSERT INTO public.product_custom_values (
            product_id, field_definition_id,
            value_text, value_integer, value_decimal, value_boolean,
            value_date, value_datetime, value_jsonb
          ) VALUES (
            v_product_id, v_field.id,
            NULLIF(v_item->>'value_text','')::text,
            CASE WHEN v_item ? 'value_integer' THEN (v_item->>'value_integer')::bigint END,
            CASE WHEN v_item ? 'value_decimal' THEN (v_item->>'value_decimal')::numeric END,
            CASE WHEN v_item ? 'value_boolean' THEN (v_item->>'value_boolean')::boolean END,
            CASE WHEN v_item ? 'value_date' THEN (v_item->>'value_date')::date END,
            CASE WHEN v_item ? 'value_datetime' THEN (v_item->>'value_datetime')::timestamptz END,
            CASE WHEN v_item ? 'value_jsonb' THEN v_item->'value_jsonb' END
          )
          ON CONFLICT (product_id, field_definition_id) DO UPDATE SET
            value_text = EXCLUDED.value_text,
            value_integer = EXCLUDED.value_integer,
            value_decimal = EXCLUDED.value_decimal,
            value_boolean = EXCLUDED.value_boolean,
            value_date = EXCLUDED.value_date,
            value_datetime = EXCLUDED.value_datetime,
            value_jsonb = EXCLUDED.value_jsonb,
            updated_at = now();
        END LOOP;
      END IF;

      UPDATE public.inventory_import_rows
         SET status = 'success', product_id = v_product_id,
             action = CASE WHEN v_row.product_id IS NULL THEN 'created' ELSE 'updated' END,
             error_message = NULL
       WHERE id = v_row.id;
      v_success := v_success + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.inventory_import_rows
         SET status = 'failed', error_message = SQLERRM
       WHERE id = v_row.id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.inventory_import_jobs
     SET status = CASE WHEN v_failed = 0 THEN 'completed' ELSE 'completed_with_errors' END,
         processed_rows = v_success + v_failed,
         success_rows = v_success,
         failed_rows = v_failed,
         completed_at = now(),
         updated_at = now()
   WHERE id = p_job_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'commit_import', 'inventory_import_jobs', p_job_id,
          jsonb_build_object('success', v_success, 'failed', v_failed, 'project_id', v_job.project_id));

  RETURN jsonb_build_object('success', v_success, 'failed', v_failed);
END $$;
