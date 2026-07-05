-- ============================================================================
-- Phase 5E — Inventory Engine executable smoke tests
-- Run inside a transaction that rolls back at the end.
-- Usage (psql): psql -f supabase/tests/phase_5e_inventory_engine.sql
-- The tests use RAISE EXCEPTION on failure so a failing assertion aborts.
-- ============================================================================

BEGIN;

-- Fixtures under ephemeral names --------------------------------------------------
DO $$
DECLARE
  v_dev_id uuid;
  v_project_id uuid;
  v_zone_id uuid;
  v_bld_id uuid;
  v_floor_id uuid;
  v_ptype_id uuid;
  v_field_area uuid;
  v_field_beds uuid;
  v_field_view uuid;
  v_view_id uuid;
  v_dup_view_id uuid;
  v_product_id uuid;
  v_clone_id uuid;
  v_import_job uuid;
  v_json jsonb;
  v_count int;
  v_err text;
  v_result jsonb;
BEGIN
  -- Test 1: reserved key rejected
  BEGIN
    INSERT INTO public.developers (name, code) VALUES ('P5E Dev', 'p5e_dev') RETURNING id INTO v_dev_id;
    INSERT INTO public.projects (developer_id, name, code, status)
      VALUES (v_dev_id, 'P5E Project', 'p5e_proj', 'active') RETURNING id INTO v_project_id;

    BEGIN
      INSERT INTO public.product_field_definitions (project_id, field_key, field_label, data_type, status)
        VALUES (v_project_id, 'product_code', 'Bad', 'text', 'active');
      RAISE EXCEPTION 'FAIL: reserved key was accepted';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM NOT LIKE 'field_key_is_reserved%' THEN RAISE; END IF;
    END;
  END;

  -- Test 2: invalid field_key format rejected
  BEGIN
    INSERT INTO public.product_field_definitions (project_id, field_key, field_label, data_type, status)
      VALUES (v_project_id, 'Bad-Key', 'x', 'text', 'active');
    RAISE EXCEPTION 'FAIL: invalid key format accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'invalid_field_key_format%' THEN RAISE; END IF;
  END;

  -- Test 3: valid field created
  INSERT INTO public.product_field_definitions (project_id, field_key, field_label, data_type, is_required, validation_rules, status)
    VALUES (v_project_id, 'carpet_area_custom', 'DT thông thuỷ', 'decimal', false,
            '{"min":10,"max":500}'::jsonb, 'active')
    RETURNING id INTO v_field_area;

  INSERT INTO public.product_field_definitions (project_id, field_key, field_label, data_type, is_required)
    VALUES (v_project_id, 'beds_custom', 'Số phòng ngủ', 'integer', true)
    RETURNING id INTO v_field_beds;

  INSERT INTO public.product_field_definitions (project_id, field_key, field_label, data_type)
    VALUES (v_project_id, 'view_custom', 'Hướng nhìn', 'single_select')
    RETURNING id INTO v_field_view;

  INSERT INTO public.product_field_options (field_definition_id, option_value, option_label, display_order, status)
    VALUES (v_field_view, 'north', 'Bắc', 1, 'active'),
           (v_field_view, 'south', 'Nam', 2, 'active');

  -- Test 4: data_type immutable after values exist
  -- (Insert a value first via product creation)
  INSERT INTO public.project_zones (project_id, name, code) VALUES (v_project_id, 'Zone A', 'zone_a') RETURNING id INTO v_zone_id;
  INSERT INTO public.buildings (project_id, zone_id, name, code) VALUES (v_project_id, v_zone_id, 'B1', 'b1') RETURNING id INTO v_bld_id;
  INSERT INTO public.floors (building_id, floor_number, floor_code) VALUES (v_bld_id, 5, 'F5') RETURNING id INTO v_floor_id;
  INSERT INTO public.product_types (project_id, name, code) VALUES (v_project_id, 'Apartment', 'apt') RETURNING id INTO v_ptype_id;

  -- Test 5: create_product_with_values happy path (validates required beds_custom)
  v_product_id := public.create_product_with_values(
    v_project_id,
    jsonb_build_object('product_code','P5E-001','product_name','Test','category','apartment',
                       'zone_id',v_zone_id,'building_id',v_bld_id,'floor_id',v_floor_id,'product_type_id',v_ptype_id),
    jsonb_build_object('carpet_area_custom', 65.5, 'beds_custom', 2, 'view_custom', 'south'),
    jsonb_build_array(jsonb_build_object('price_code','primary','amount',3000000000,'currency','VND','is_primary',true,'status','active'))
  );

  -- Test 6: required field missing → rejected
  BEGIN
    PERFORM public.create_product_with_values(
      v_project_id,
      jsonb_build_object('product_code','P5E-BAD','category','apartment','product_type_id',v_ptype_id),
      jsonb_build_object('carpet_area_custom', 50), -- missing beds_custom (required)
      NULL);
    RAISE EXCEPTION 'FAIL: required field not enforced';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'required_custom_fields_missing%' THEN RAISE; END IF;
  END;

  -- Test 7: validation_rules min/max
  BEGIN
    PERFORM public.update_product_with_values(v_product_id, NULL,
      jsonb_build_object('carpet_area_custom', 5), NULL);
    RAISE EXCEPTION 'FAIL: min validation not enforced';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'value_below_min%' THEN RAISE; END IF;
  END;

  -- Test 8: data_type change rejected after values exist
  BEGIN
    UPDATE public.product_field_definitions SET data_type = 'text' WHERE id = v_field_area;
    RAISE EXCEPTION 'FAIL: data_type change accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'data_type_immutable%' THEN RAISE; END IF;
  END;

  -- Test 9: relationship validation (building wrong project)
  BEGIN
    PERFORM public.validate_product_relationships(
      gen_random_uuid(), v_zone_id, v_bld_id, v_floor_id, NULL);
    RAISE EXCEPTION 'FAIL: relationship not validated';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'zone_wrong_project%' AND SQLERRM NOT LIKE 'building_wrong_project%' THEN RAISE; END IF;
  END;

  -- Test 10: unique primary active price enforced
  BEGIN
    INSERT INTO public.product_price_options (product_id, price_code, amount, currency, is_primary, status)
      VALUES (v_product_id, 'secondary', 2900000000, 'VND', true, 'active');
    RAISE EXCEPTION 'FAIL: second primary allowed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Test 11: amount >= 0 enforced
  BEGIN
    INSERT INTO public.product_price_options (product_id, price_code, amount, currency, is_primary, status)
      VALUES (v_product_id, 'discount', -100, 'VND', false, 'active');
    RAISE EXCEPTION 'FAIL: negative amount accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Test 12: price history logged on INSERT
  SELECT count(*) INTO v_count FROM public.product_price_history WHERE product_id = v_product_id;
  IF v_count < 1 THEN RAISE EXCEPTION 'FAIL: price history not logged (%)', v_count; END IF;

  -- Test 13: price history logged on amount UPDATE
  UPDATE public.product_price_options SET amount = 3100000000 WHERE product_id = v_product_id AND price_code = 'primary';
  SELECT count(*) INTO v_count FROM public.product_price_history WHERE product_id = v_product_id;
  IF v_count < 2 THEN RAISE EXCEPTION 'FAIL: price history on update missing (%)', v_count; END IF;

  -- Test 14: clone_product
  v_clone_id := public.clone_product(v_product_id, 'P5E-001-COPY');
  SELECT count(*) INTO v_count FROM public.product_custom_values WHERE product_id = v_clone_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'FAIL: clone did not copy custom values'; END IF;

  -- Test 15: archive_product idempotent
  PERFORM public.archive_product(v_clone_id);
  PERFORM public.archive_product(v_clone_id);
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_clone_id AND archived_at IS NOT NULL) THEN
    RAISE EXCEPTION 'FAIL: archive not applied';
  END IF;

  -- Test 16: restore_product
  PERFORM public.restore_product(v_clone_id);
  IF EXISTS (SELECT 1 FROM public.products WHERE id = v_clone_id AND archived_at IS NOT NULL) THEN
    RAISE EXCEPTION 'FAIL: restore not applied';
  END IF;

  -- Test 17: search_inventory returns product with tiebreaker
  IF NOT EXISTS (
    SELECT 1 FROM public.search_inventory(v_project_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10, 0)
  ) THEN RAISE EXCEPTION 'FAIL: search_inventory empty for project'; END IF;

  -- Test 18: search_inventory limit cap = 200
  SELECT count(*) INTO v_count FROM public.search_inventory(NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10000, 0);
  IF v_count > 200 THEN RAISE EXCEPTION 'FAIL: limit cap not applied (%)', v_count; END IF;

  -- Test 19: inventory view + save_inventory_view_fields atomic replace
  INSERT INTO public.inventory_views (project_id, name, code, view_type, status)
    VALUES (v_project_id, 'Default admin', 'default_admin', 'admin_table', 'active')
    RETURNING id INTO v_view_id;

  v_count := public.save_inventory_view_fields(v_view_id,
    jsonb_build_array(
      jsonb_build_object('field_source','core','core_field_key','product_code','column_label','Mã','display_order',10,'visible',true),
      jsonb_build_object('field_source','custom','field_definition_id',v_field_area,'column_label','DT','display_order',20,'visible',true),
      jsonb_build_object('field_source','price','price_code','primary','column_label','Giá','display_order',30,'visible',true)
    ));
  IF v_count <> 3 THEN RAISE EXCEPTION 'FAIL: save fields count=%', v_count; END IF;

  -- Test 20: duplicate field rejected
  BEGIN
    PERFORM public.save_inventory_view_fields(v_view_id, jsonb_build_array(
      jsonb_build_object('field_source','core','core_field_key','product_code','display_order',1),
      jsonb_build_object('field_source','core','core_field_key','product_code','display_order',2)
    ));
    RAISE EXCEPTION 'FAIL: duplicate field accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'duplicate_field%' THEN RAISE; END IF;
  END;

  -- Test 21: invalid core key rejected
  BEGIN
    PERFORM public.save_inventory_view_fields(v_view_id, jsonb_build_array(
      jsonb_build_object('field_source','core','core_field_key','not_a_real_key')));
    RAISE EXCEPTION 'FAIL: invalid core key accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'invalid_core_field_key%' THEN RAISE; END IF;
  END;

  -- Test 22: duplicate_inventory_view copies fields
  v_dup_view_id := public.duplicate_inventory_view(v_view_id, 'Copy', 'default_admin_copy');
  SELECT count(*) INTO v_count FROM public.inventory_view_fields WHERE inventory_view_id = v_dup_view_id;
  IF v_count <> 3 THEN RAISE EXCEPTION 'FAIL: duplicate did not copy fields (%)', v_count; END IF;

  -- Test 23: set_default_inventory_view syncs pointer
  INSERT INTO public.project_inventory_settings (project_id) VALUES (v_project_id) ON CONFLICT DO NOTHING;
  PERFORM public.set_default_inventory_view(v_view_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.project_inventory_settings WHERE project_id = v_project_id AND default_admin_view_id = v_view_id
  ) THEN RAISE EXCEPTION 'FAIL: default view pointer not synced'; END IF;

  -- Test 24: validate_inventory_view returns is_valid=true
  v_result := public.validate_inventory_view(v_view_id);
  IF NOT (v_result->>'is_valid')::boolean THEN RAISE EXCEPTION 'FAIL: view marked invalid: %', v_result; END IF;

  -- Test 25: import add rows + limits + duplicate detection
  INSERT INTO public.inventory_import_jobs (project_id, file_name, import_type, status)
    VALUES (v_project_id, 'test.csv', 'products', 'pending') RETURNING id INTO v_import_job;
  PERFORM public.inventory_import_add_rows(v_import_job, jsonb_build_array(
    jsonb_build_object('product_code','P5E-IMP-1','row_number',1,'raw_data', jsonb_build_object(
      'core', jsonb_build_object('category','apartment','product_type_id',v_ptype_id),
      'custom', jsonb_build_object('beds_custom', 3)))
  ));
  BEGIN
    PERFORM public.inventory_import_add_rows(v_import_job, jsonb_build_array(
      jsonb_build_object('product_code','P5E-IMP-1','row_number',2,'raw_data',jsonb_build_object())));
    RAISE EXCEPTION 'FAIL: duplicate product_code in job accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'duplicate_product_code_in_job%' THEN RAISE; END IF;
  END;

  -- Test 26: commit_inventory_import ALL_OR_NOTHING (this row will succeed)
  v_result := public.commit_inventory_import(v_import_job);
  IF (v_result->>'success')::int <> 1 THEN RAISE EXCEPTION 'FAIL: commit success count=%', v_result; END IF;

  -- Test 27: cannot commit twice
  BEGIN
    PERFORM public.commit_inventory_import(v_import_job);
    RAISE EXCEPTION 'FAIL: commit-twice allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'job_not_pending%' THEN RAISE; END IF;
  END;

  -- Test 28: get_product_admin_detail returns structured payload
  v_result := public.get_product_admin_detail(v_product_id);
  IF v_result IS NULL OR v_result->>'product' IS NULL THEN RAISE EXCEPTION 'FAIL: admin detail empty'; END IF;
  IF NOT (v_result#>'{permissions,can_manage}')::boolean IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'FAIL: permissions block missing';
  END IF;

  -- Test 29: option value immutability once used
  UPDATE public.product_custom_values SET value_text = 'south' WHERE product_id = v_product_id AND field_definition_id = v_field_view;
  BEGIN
    UPDATE public.product_field_options SET option_value = 'south_v2' WHERE field_definition_id = v_field_view AND option_value = 'south';
    RAISE EXCEPTION 'FAIL: option value change allowed after use';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'option_value_immutable%' THEN RAISE; END IF;
  END;

  -- Test 30: invalid single_select value rejected
  BEGIN
    PERFORM public.update_product_with_values(v_product_id, NULL,
      jsonb_build_object('view_custom', 'not_an_option'), NULL);
    RAISE EXCEPTION 'FAIL: invalid select option accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'invalid_single_select_option%' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'Phase 5E smoke tests PASSED (30 assertions)';
END $$;

ROLLBACK;