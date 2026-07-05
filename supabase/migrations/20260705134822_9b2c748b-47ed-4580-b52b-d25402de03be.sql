
CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_voucher_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.events%ROWTYPE;
  v_lead_id uuid;
  v_reg_id uuid; v_reg_code text;
  v_count int; v_user_count int;
  v_elig jsonb; v_reg_type text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text, 43));

  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;

  v_elig := public.check_event_eligibility(p_event_id, p_product_id, p_product_type_id, p_policy_id, p_voucher_id);
  IF NOT (v_elig->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', v_elig->>'code';
  END IF;

  v_count := public._event_registration_count(p_event_id);
  IF v.capacity IS NOT NULL AND v_count >= v.capacity THEN
    RAISE EXCEPTION 'event_full';
  END IF;

  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE event_id = p_event_id
      AND public.is_event_registration_type(registration_type)
      AND created_by = auth.uid()
      AND status IN ('new','in_progress','confirmed','completed');
  IF v_user_count >= v.per_user_limit THEN
    RAISE EXCEPTION 'event_user_limit_reached';
  END IF;
  IF v.per_user_limit = 1 AND EXISTS (
    SELECT 1 FROM public.registrations
     WHERE event_id = p_event_id
       AND public.is_event_registration_type(registration_type)
       AND created_by = auth.uid()
       AND status IN ('new','in_progress','confirmed','completed')
  ) THEN
    RAISE EXCEPTION 'duplicate_event_registration';
  END IF;

  BEGIN
    v_lead_id := public.get_or_create_registration_lead(auth.uid(), v.project_id, p_product_id);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'profile_incomplete' THEN
      RAISE EXCEPTION 'event_profile_incomplete';
    END IF;
    RAISE;
  END;

  v_reg_type := CASE WHEN v.event_type = 'site_tour' THEN 'site_tour' ELSE 'event' END;

  INSERT INTO public.registrations(registration_type, lead_id, project_id, product_id,
                                    event_id, created_by, status, note, metadata)
  VALUES (v_reg_type, v_lead_id, v.project_id, p_product_id, p_event_id, auth.uid(), 'new',
          p_note, jsonb_build_object('product_type_id', p_product_type_id,
                                     'policy_id', p_policy_id, 'voucher_id', p_voucher_id))
  RETURNING id, registration_code INTO v_reg_id, v_reg_code;

  UPDATE public.events SET registered_count = v_count + 1, updated_at = now() WHERE id = p_event_id;

  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'register_for_event','registrations',v_reg_id,
          jsonb_build_object('event_id',p_event_id,'lead_id',v_lead_id,'event_type',v.event_type));

  RETURN jsonb_build_object('registration_id',v_reg_id,'registration_code',v_reg_code,
    'status','new','event_id',p_event_id,'event_type',v.event_type,
    'remaining', CASE WHEN v.capacity IS NULL THEN NULL ELSE greatest(0, v.capacity - (v_count+1)) END);
END $$;
