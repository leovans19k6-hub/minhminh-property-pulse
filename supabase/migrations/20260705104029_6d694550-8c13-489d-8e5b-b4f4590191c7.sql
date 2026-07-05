CREATE OR REPLACE FUNCTION public.set_product_custom_values(
  p_product_id uuid,
  p_values jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_item jsonb;
  v_field_id uuid;
  v_delete boolean;
BEGIN
  SELECT project_id INTO v_project_id FROM public.products WHERE id = p_product_id;
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.is_project_manager(v_project_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF p_values IS NULL OR jsonb_typeof(p_values) <> 'array' THEN
    RAISE EXCEPTION 'values_must_be_array';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_values) LOOP
    v_field_id := (v_item->>'field_definition_id')::uuid;
    v_delete := COALESCE((v_item->>'delete')::boolean, false);
    IF v_field_id IS NULL THEN
      RAISE EXCEPTION 'field_definition_id_required';
    END IF;

    IF v_delete THEN
      DELETE FROM public.product_custom_values
       WHERE product_id = p_product_id AND field_definition_id = v_field_id;
      CONTINUE;
    END IF;

    INSERT INTO public.product_custom_values (
      product_id, field_definition_id,
      value_text, value_integer, value_decimal, value_boolean,
      value_date, value_datetime, value_jsonb
    ) VALUES (
      p_product_id, v_field_id,
      NULLIF(v_item->>'value_text','')::text,
      CASE WHEN v_item ? 'value_integer' AND v_item->>'value_integer' IS NOT NULL
           THEN (v_item->>'value_integer')::bigint ELSE NULL END,
      CASE WHEN v_item ? 'value_decimal' AND v_item->>'value_decimal' IS NOT NULL
           THEN (v_item->>'value_decimal')::numeric ELSE NULL END,
      CASE WHEN v_item ? 'value_boolean' AND v_item->>'value_boolean' IS NOT NULL
           THEN (v_item->>'value_boolean')::boolean ELSE NULL END,
      CASE WHEN v_item ? 'value_date' AND v_item->>'value_date' IS NOT NULL
           THEN (v_item->>'value_date')::date ELSE NULL END,
      CASE WHEN v_item ? 'value_datetime' AND v_item->>'value_datetime' IS NOT NULL
           THEN (v_item->>'value_datetime')::timestamptz ELSE NULL END,
      CASE WHEN v_item ? 'value_jsonb' AND (v_item->'value_jsonb') IS NOT NULL AND jsonb_typeof(v_item->'value_jsonb') <> 'null'
           THEN v_item->'value_jsonb' ELSE NULL END
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
END $$;

REVOKE ALL ON FUNCTION public.set_product_custom_values(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.set_product_custom_values(uuid, jsonb) TO authenticated;