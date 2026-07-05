
-- =========================================================
-- Phase 6C.1 — Additive hardening (no schema changes, no data migration)
-- =========================================================

-- ---------------------------------------------------------
-- 1. Canonical registration-type predicate
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_event_registration_type(p_type text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_type IN ('event','site_tour');
$$;
GRANT EXECUTE ON FUNCTION public.is_event_registration_type(text) TO PUBLIC;

-- ---------------------------------------------------------
-- 2. IANA timezone validation for events
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_event_timezone()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.timezone IS NULL OR NEW.timezone = '' THEN
    RAISE EXCEPTION 'event_timezone_required' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'event_timezone_invalid' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_event_timezone ON public.events;
CREATE TRIGGER trg_validate_event_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.validate_event_timezone();

-- ---------------------------------------------------------
-- 3. Shared trusted lead helper (internal only)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_registration_lead(
  p_user_id uuid,
  p_project_id uuid,
  p_product_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prof public.profiles%ROWTYPE;
  v_norm text;
  v_lead_id uuid;
  v_source_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'lead_helper_missing_user' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = p_user_id;
  IF v_prof IS NULL
     OR COALESCE(v_prof.full_name,'') = ''
     OR COALESCE(v_prof.phone,'') = '' THEN
    RAISE EXCEPTION 'profile_incomplete' USING ERRCODE='22023';
  END IF;

  v_norm := public.normalize_phone(v_prof.phone);
  IF v_norm IS NULL OR v_norm = '' THEN
    RAISE EXCEPTION 'profile_incomplete' USING ERRCODE='22023';
  END IF;

  -- Serialize per normalized phone to avoid concurrent duplicate INSERTs
  PERFORM pg_advisory_xact_lock(hashtextextended(v_norm, 91));

  -- Deterministic canonical selection: oldest wins
  SELECT id INTO v_lead_id FROM public.leads
    WHERE normalized_phone = v_norm
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

  IF v_lead_id IS NULL THEN
    SELECT id INTO v_source_id FROM public.lead_sources WHERE code = 'app' LIMIT 1;
    INSERT INTO public.leads(full_name, phone, email, source_id,
                             interested_project_id, interested_product_id,
                             created_by, status, priority)
    VALUES (v_prof.full_name, v_prof.phone, NULL, v_source_id,
            p_project_id, p_product_id, p_user_id, 'new', 'normal')
    RETURNING id INTO v_lead_id;
  END IF;

  RETURN v_lead_id;
END $$;

REVOKE ALL ON FUNCTION public.get_or_create_registration_lead(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_registration_lead(uuid,uuid,uuid) TO service_role;

-- ---------------------------------------------------------
-- 4. Refactor register_for_event to use the shared helper
-- ---------------------------------------------------------
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

  v_lead_id := public.get_or_create_registration_lead(auth.uid(), v.project_id, p_product_id);

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

-- ---------------------------------------------------------
-- 5. Refactor register_for_voucher to use the shared helper
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_for_voucher(
  p_voucher_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v public.vouchers%ROWTYPE;
  v_lead_id uuid;
  v_reg_id uuid; v_reg_code text;
  v_count int; v_user_count int;
  v_elig jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_voucher_id::text, 42));

  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;

  v_elig := public.check_voucher_eligibility(p_voucher_id, p_product_id, p_product_type_id, p_policy_id);
  IF NOT (v_elig->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', v_elig->>'code';
  END IF;

  v_count := public._voucher_registration_count(p_voucher_id);
  IF v.quantity IS NOT NULL AND v_count >= v.quantity THEN
    RAISE EXCEPTION 'voucher_full';
  END IF;
  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE voucher_id = p_voucher_id AND registration_type='voucher'
      AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed');
  IF v_user_count >= v.per_user_limit THEN
    RAISE EXCEPTION 'voucher_user_limit_reached';
  END IF;
  IF v.per_user_limit = 1 AND EXISTS (
    SELECT 1 FROM public.registrations WHERE voucher_id = p_voucher_id
      AND registration_type='voucher' AND created_by = auth.uid()
      AND status IN ('new','in_progress','confirmed','completed')
  ) THEN
    RAISE EXCEPTION 'duplicate_voucher_registration';
  END IF;

  BEGIN
    v_lead_id := public.get_or_create_registration_lead(auth.uid(), v.project_id, p_product_id);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'profile_incomplete' THEN
      RAISE EXCEPTION 'voucher_profile_incomplete';
    END IF;
    RAISE;
  END;

  INSERT INTO public.registrations(registration_type, lead_id, project_id, product_id,
                                    voucher_id, created_by, status, note, metadata)
  VALUES ('voucher', v_lead_id, v.project_id, p_product_id, p_voucher_id, auth.uid(), 'new',
          p_note, jsonb_build_object('product_type_id', p_product_type_id, 'policy_id', p_policy_id))
  RETURNING id, registration_code INTO v_reg_id, v_reg_code;

  UPDATE public.vouchers SET registered_count = v_count + 1, updated_at = now() WHERE id = p_voucher_id;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(),'register_for_voucher','registrations',v_reg_id,
          jsonb_build_object('voucher_id',p_voucher_id,'lead_id',v_lead_id));

  RETURN jsonb_build_object('registration_id',v_reg_id,'registration_code',v_reg_code,
    'status','new','voucher_id',p_voucher_id,
    'remaining', CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - (v_count+1)) END);
END $$;
