
-- ============================================================
-- PHASE 6C — EVENTS + SITE TOUR MANAGEMENT ENGINE
-- ============================================================

-- SECTION A: Additive schema on events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  ADD COLUMN IF NOT EXISTS registration_start timestamptz,
  ADD COLUMN IF NOT EXISTS location_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS location_notes text,
  ADD COLUMN IF NOT EXISTS agenda_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS speakers_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS site_tour_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applicability_scope text NOT NULL DEFAULT 'project_wide',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_limit integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Broaden event_type check to canonical set + retain existing values
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'site_tour','sales_event','training','opening','customer_event','other',
    'event','launch'
  ));

-- Extend status check to include 'paused'
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check
  CHECK (status IN ('active','inactive','draft','paused','archived','completed','cancelled'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_applicability_scope_check;
ALTER TABLE public.events ADD CONSTRAINT events_applicability_scope_check
  CHECK (applicability_scope IN ('project_wide','product_types','specific_products','sales_policies','vouchers','mixed'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_location_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_location_type_check
  CHECK (location_type IN ('physical','online','hybrid'));

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_capacity_check;
ALTER TABLE public.events ADD CONSTRAINT events_capacity_check
  CHECK (capacity IS NULL OR capacity >= 1);
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_per_user_limit_check;
ALTER TABLE public.events ADD CONSTRAINT events_per_user_limit_check
  CHECK (per_user_limit >= 1);

CREATE INDEX IF NOT EXISTS events_type_idx ON public.events(event_type);
CREATE INDEX IF NOT EXISTS events_reg_deadline_idx ON public.events(registration_deadline);

-- SECTION B: event_sessions
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location_text text,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.event_sessions TO authenticated;
GRANT ALL ON public.event_sessions TO service_role;
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_sessions_read ON public.event_sessions;
CREATE POLICY event_sessions_read ON public.event_sessions FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS event_sessions_no_write ON public.event_sessions;
CREATE POLICY event_sessions_no_write ON public.event_sessions FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS event_sessions_event_idx ON public.event_sessions(event_id, starts_at, display_order, id);

DROP TRIGGER IF EXISTS trg_event_sessions_updated_at ON public.event_sessions;
CREATE TRIGGER trg_event_sessions_updated_at BEFORE UPDATE ON public.event_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SECTION C: Audience junction tables
CREATE TABLE IF NOT EXISTS public.event_product_types (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_type_id uuid NOT NULL REFERENCES public.product_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, product_type_id)
);
GRANT SELECT ON public.event_product_types TO authenticated;
GRANT ALL ON public.event_product_types TO service_role;
ALTER TABLE public.event_product_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_product_types_read ON public.event_product_types;
CREATE POLICY event_product_types_read ON public.event_product_types FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS event_product_types_no_write ON public.event_product_types;
CREATE POLICY event_product_types_no_write ON public.event_product_types FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS event_product_types_pt_idx ON public.event_product_types(product_type_id);

CREATE TABLE IF NOT EXISTS public.event_products (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, product_id)
);
GRANT SELECT ON public.event_products TO authenticated;
GRANT ALL ON public.event_products TO service_role;
ALTER TABLE public.event_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_products_read ON public.event_products;
CREATE POLICY event_products_read ON public.event_products FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS event_products_no_write ON public.event_products;
CREATE POLICY event_products_no_write ON public.event_products FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS event_products_product_idx ON public.event_products(product_id);

CREATE TABLE IF NOT EXISTS public.event_sales_policies (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.sales_policies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, policy_id)
);
GRANT SELECT ON public.event_sales_policies TO authenticated;
GRANT ALL ON public.event_sales_policies TO service_role;
ALTER TABLE public.event_sales_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_sales_policies_read ON public.event_sales_policies;
CREATE POLICY event_sales_policies_read ON public.event_sales_policies FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS event_sales_policies_no_write ON public.event_sales_policies;
CREATE POLICY event_sales_policies_no_write ON public.event_sales_policies FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS event_sales_policies_policy_idx ON public.event_sales_policies(policy_id);

CREATE TABLE IF NOT EXISTS public.event_vouchers (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, voucher_id)
);
GRANT SELECT ON public.event_vouchers TO authenticated;
GRANT ALL ON public.event_vouchers TO service_role;
ALTER TABLE public.event_vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS event_vouchers_read ON public.event_vouchers;
CREATE POLICY event_vouchers_read ON public.event_vouchers FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS event_vouchers_no_write ON public.event_vouchers;
CREATE POLICY event_vouchers_no_write ON public.event_vouchers FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS event_vouchers_voucher_idx ON public.event_vouchers(voucher_id);

-- SECTION D: Harden events RLS (deny direct writes)
DROP POLICY IF EXISTS events_manage ON public.events;
DROP POLICY IF EXISTS events_read ON public.events;
CREATE POLICY events_read ON public.events FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY events_deny_write ON public.events FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- SECTION E: Tighten registrations_insert (block direct event/site_tour inserts too)
DROP POLICY IF EXISTS registrations_insert ON public.registrations;
CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND registration_type NOT IN ('voucher','event','site_tour'));

-- SECTION F: Validation helpers
CREATE OR REPLACE FUNCTION public.validate_event_dates(
  p_reg_start timestamptz, p_reg_deadline timestamptz,
  p_start timestamptz, p_end timestamptz)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_start IS NOT NULL AND p_end IS NOT NULL AND p_end <= p_start THEN
    RAISE EXCEPTION 'invalid_event_dates'; END IF;
  IF p_reg_start IS NOT NULL AND p_reg_deadline IS NOT NULL AND p_reg_deadline < p_reg_start THEN
    RAISE EXCEPTION 'invalid_event_dates'; END IF;
  IF p_reg_deadline IS NOT NULL AND p_end IS NOT NULL AND p_reg_deadline > p_end THEN
    RAISE EXCEPTION 'invalid_event_dates'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_event_location(
  p_type text, p_venue text, p_address text, p_url text,
  p_lat numeric, p_lng numeric)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_type NOT IN ('physical','online','hybrid') THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
  IF p_type = 'physical' AND COALESCE(p_venue,'') = '' AND COALESCE(p_address,'') = '' THEN
    RAISE EXCEPTION 'invalid_event_location'; END IF;
  IF p_type = 'online' AND (p_url IS NULL OR p_url !~* '^https?://') THEN
    RAISE EXCEPTION 'invalid_event_location'; END IF;
  IF p_type = 'hybrid' THEN
    IF COALESCE(p_venue,'') = '' AND COALESCE(p_address,'') = '' THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
    IF p_url IS NULL OR p_url !~* '^https?://' THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
  END IF;
  IF p_url IS NOT NULL AND p_url <> '' AND p_url !~* '^https?://' THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
  IF p_lat IS NOT NULL AND (p_lat < -90 OR p_lat > 90) THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
  IF p_lng IS NOT NULL AND (p_lng < -180 OR p_lng > 180) THEN RAISE EXCEPTION 'invalid_event_location'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_site_tour_details(p_event_type text, p_details jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; c int;
BEGIN
  IF p_details IS NULL OR jsonb_typeof(p_details) <> 'object' THEN
    RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
  IF p_event_type <> 'site_tour' THEN
    -- Only site_tour may have meaningful details; empty object required
    IF p_details <> '{}'::jsonb THEN
      -- Allow keys but they must be all null / empty
      IF (SELECT count(*) FROM jsonb_each(p_details) WHERE value <> 'null'::jsonb AND value <> '""'::jsonb) > 0 THEN
        RAISE EXCEPTION 'invalid_site_tour_details' USING MESSAGE='site_tour_details only allowed for site_tour';
      END IF;
    END IF;
    RETURN;
  END IF;
  IF p_details ? 'included' THEN
    IF jsonb_typeof(p_details->'included') <> 'array' THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    IF jsonb_array_length(p_details->'included') > 30 THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    FOR v IN SELECT * FROM jsonb_array_elements(p_details->'included') LOOP
      IF jsonb_typeof(v) <> 'string' OR length(v#>>'{}') > 200 THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    END LOOP;
  END IF;
  IF p_details ? 'requirements' THEN
    IF jsonb_typeof(p_details->'requirements') <> 'array' THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    IF jsonb_array_length(p_details->'requirements') > 30 THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    FOR v IN SELECT * FROM jsonb_array_elements(p_details->'requirements') LOOP
      IF jsonb_typeof(v) <> 'string' OR length(v#>>'{}') > 200 THEN RAISE EXCEPTION 'invalid_site_tour_details'; END IF;
    END LOOP;
  END IF;
  FOR c IN SELECT 1 FROM jsonb_object_keys(p_details) k
    WHERE k NOT IN ('meeting_point','transportation','departure_time','return_time','included','requirements','contact_note') LOOP
    RAISE EXCEPTION 'invalid_site_tour_details' USING MESSAGE='unknown key';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_event_agenda(p_agenda jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb;
BEGIN
  IF p_agenda IS NULL OR jsonb_typeof(p_agenda) <> 'array' THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
  IF jsonb_array_length(p_agenda) > 100 THEN RAISE EXCEPTION 'too_many_event_agenda_items'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_agenda) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'duplicate_event_agenda_id'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'title','') = '' OR length(v->>'title') > 200 THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
    IF v ? 'description' AND length(v->>'description') > 2000 THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
    IF v ? 'time_label' AND length(v->>'time_label') > 40 THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
    IF v ? 'location' AND length(v->>'location') > 200 THEN RAISE EXCEPTION 'invalid_event_agenda'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_event_speakers(p_speakers jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb; v_url text;
BEGIN
  IF p_speakers IS NULL OR jsonb_typeof(p_speakers) <> 'array' THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
  IF jsonb_array_length(p_speakers) > 50 THEN RAISE EXCEPTION 'too_many_event_speakers'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_speakers) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'duplicate_event_speaker_id'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'name','') = '' OR length(v->>'name') > 200 THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
    IF v ? 'title' AND length(v->>'title') > 200 THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
    IF v ? 'organization' AND length(v->>'organization') > 200 THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
    IF v ? 'bio' AND length(v->>'bio') > 2000 THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
    v_url := v->>'avatar_url';
    IF v_url IS NOT NULL AND v_url <> '' AND v_url !~* '^https?://' THEN RAISE EXCEPTION 'invalid_event_speakers'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_event_attachments(p_attachments jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb; v_url text; v_type text;
BEGIN
  IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN RAISE EXCEPTION 'invalid_event_attachment'; END IF;
  IF jsonb_array_length(p_attachments) > 30 THEN RAISE EXCEPTION 'too_many_event_attachments'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_attachments) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_event_attachment'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'invalid_event_attachment'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'label','') = '' THEN RAISE EXCEPTION 'invalid_event_attachment'; END IF;
    v_url := v->>'url';
    IF v_url IS NULL OR v_url !~* '^https?://' THEN RAISE EXCEPTION 'invalid_event_attachment'; END IF;
    v_type := COALESCE(v->>'type','link');
    IF v_type NOT IN ('pdf','image','document','spreadsheet','video','link') THEN
      RAISE EXCEPTION 'invalid_event_attachment'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_event_session_row(
  p_start timestamptz, p_end timestamptz,
  p_evt_start timestamptz, p_evt_end timestamptz, p_title text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF COALESCE(p_title,'') = '' OR length(p_title) > 200 THEN RAISE EXCEPTION 'invalid_event_session'; END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end <= p_start THEN RAISE EXCEPTION 'invalid_event_session'; END IF;
  IF p_evt_start IS NOT NULL AND p_start < p_evt_start THEN RAISE EXCEPTION 'invalid_event_session'; END IF;
  IF p_evt_end IS NOT NULL AND p_end > p_evt_end THEN RAISE EXCEPTION 'invalid_event_session'; END IF;
END $$;

-- SECTION G: registration count + derived state
CREATE OR REPLACE FUNCTION public._event_registration_count(p_event_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.registrations
    WHERE event_id = p_event_id AND registration_type IN ('event','site_tour')
      AND status IN ('new','in_progress','confirmed','completed');
$$;
REVOKE ALL ON FUNCTION public._event_registration_count(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.event_derived_state(p_event_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; c int; n timestamptz := now();
BEGIN
  SELECT * INTO v FROM public.events WHERE id = p_event_id;
  IF v IS NULL THEN RETURN NULL; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RETURN 'archived'; END IF;
  IF v.status = 'draft' THEN RETURN 'draft'; END IF;
  IF v.status = 'paused' THEN RETURN 'paused'; END IF;
  IF v.status = 'cancelled' THEN RETURN 'cancelled'; END IF;
  IF v.status = 'completed' THEN RETURN 'completed'; END IF;
  IF v.status IN ('active','inactive') THEN
    IF v.end_at IS NOT NULL AND v.end_at < n THEN RETURN 'completed'; END IF;
    IF v.start_at IS NOT NULL AND v.start_at <= n AND (v.end_at IS NULL OR v.end_at >= n) THEN RETURN 'ongoing'; END IF;
    IF v.registration_start IS NOT NULL AND v.registration_start > n THEN RETURN 'upcoming_registration'; END IF;
    IF v.registration_deadline IS NOT NULL AND v.registration_deadline < n THEN RETURN 'registration_closed'; END IF;
    c := public._event_registration_count(p_event_id);
    IF v.capacity IS NOT NULL AND c >= v.capacity THEN RETURN 'full'; END IF;
    IF v.registration_start IS NOT NULL AND v.registration_start <= n THEN RETURN 'registration_open'; END IF;
    RETURN 'upcoming';
  END IF;
  RETURN v.status;
END $$;

-- SECTION H: applicability applier
CREATE OR REPLACE FUNCTION public._apply_event_audience(
  p_event_id uuid, p_project_id uuid,
  p_product_type_ids uuid[], p_product_ids uuid[],
  p_policy_ids uuid[], p_voucher_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_x uuid; v_scope text; c1 int := 0; c2 int := 0; c3 int := 0; c4 int := 0;
BEGIN
  IF p_product_type_ids IS NOT NULL THEN
    FOREACH v_x IN ARRAY p_product_type_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.product_types WHERE id = v_x
        AND (project_id IS NULL OR project_id = p_project_id)) THEN
        RAISE EXCEPTION 'invalid_event_product_type'; END IF;
    END LOOP;
  END IF;
  IF p_product_ids IS NOT NULL THEN
    FOREACH v_x IN ARRAY p_product_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_x AND project_id = p_project_id) THEN
        RAISE EXCEPTION 'invalid_event_product'; END IF;
    END LOOP;
  END IF;
  IF p_policy_ids IS NOT NULL THEN
    FOREACH v_x IN ARRAY p_policy_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.sales_policies WHERE id = v_x AND project_id = p_project_id) THEN
        RAISE EXCEPTION 'invalid_event_policy'; END IF;
    END LOOP;
  END IF;
  IF p_voucher_ids IS NOT NULL THEN
    FOREACH v_x IN ARRAY p_voucher_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.vouchers WHERE id = v_x AND project_id = p_project_id) THEN
        RAISE EXCEPTION 'invalid_event_voucher'; END IF;
    END LOOP;
  END IF;

  DELETE FROM public.event_product_types WHERE event_id = p_event_id;
  DELETE FROM public.event_products WHERE event_id = p_event_id;
  DELETE FROM public.event_sales_policies WHERE event_id = p_event_id;
  DELETE FROM public.event_vouchers WHERE event_id = p_event_id;

  IF p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids,1) > 0 THEN
    INSERT INTO public.event_product_types(event_id, product_type_id)
    SELECT p_event_id, unnest(p_product_type_ids) ON CONFLICT DO NOTHING;
    c1 := array_length(p_product_type_ids,1);
  END IF;
  IF p_product_ids IS NOT NULL AND array_length(p_product_ids,1) > 0 THEN
    INSERT INTO public.event_products(event_id, product_id)
    SELECT p_event_id, unnest(p_product_ids) ON CONFLICT DO NOTHING;
    c2 := array_length(p_product_ids,1);
  END IF;
  IF p_policy_ids IS NOT NULL AND array_length(p_policy_ids,1) > 0 THEN
    INSERT INTO public.event_sales_policies(event_id, policy_id)
    SELECT p_event_id, unnest(p_policy_ids) ON CONFLICT DO NOTHING;
    c3 := array_length(p_policy_ids,1);
  END IF;
  IF p_voucher_ids IS NOT NULL AND array_length(p_voucher_ids,1) > 0 THEN
    INSERT INTO public.event_vouchers(event_id, voucher_id)
    SELECT p_event_id, unnest(p_voucher_ids) ON CONFLICT DO NOTHING;
    c4 := array_length(p_voucher_ids,1);
  END IF;

  IF (c1+c2+c3+c4) = 0 THEN v_scope := 'project_wide';
  ELSIF ((c1>0)::int + (c2>0)::int + (c3>0)::int + (c4>0)::int) > 1 THEN v_scope := 'mixed';
  ELSIF c1>0 THEN v_scope := 'product_types';
  ELSIF c2>0 THEN v_scope := 'specific_products';
  ELSIF c3>0 THEN v_scope := 'sales_policies';
  ELSE v_scope := 'vouchers';
  END IF;
  UPDATE public.events SET applicability_scope = v_scope, updated_at = now() WHERE id = p_event_id;
END $$;
REVOKE ALL ON FUNCTION public._apply_event_audience(uuid,uuid,uuid[],uuid[],uuid[],uuid[]) FROM PUBLIC, anon, authenticated;

-- Sessions applier
CREATE OR REPLACE FUNCTION public._apply_event_sessions(
  p_event_id uuid, p_sessions jsonb,
  p_evt_start timestamptz, p_evt_end timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; v_start timestamptz; v_end timestamptz; c int;
BEGIN
  IF p_sessions IS NULL THEN RETURN; END IF;
  IF jsonb_typeof(p_sessions) <> 'array' THEN RAISE EXCEPTION 'invalid_event_session'; END IF;
  c := jsonb_array_length(p_sessions);
  IF c > 100 THEN RAISE EXCEPTION 'too_many_event_sessions'; END IF;
  DELETE FROM public.event_sessions WHERE event_id = p_event_id;
  IF c = 0 THEN RETURN; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_sessions) LOOP
    v_start := NULLIF(v->>'starts_at','')::timestamptz;
    v_end := NULLIF(v->>'ends_at','')::timestamptz;
    PERFORM public.validate_event_session_row(v_start, v_end, p_evt_start, p_evt_end, v->>'title');
    INSERT INTO public.event_sessions(event_id, title, description, starts_at, ends_at, location_text, display_order, metadata)
    VALUES (p_event_id, v->>'title', v->>'description', v_start, v_end,
            v->>'location_text', COALESCE(NULLIF(v->>'display_order','')::int, 0),
            COALESCE(v->'metadata','{}'::jsonb));
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public._apply_event_sessions(uuid,jsonb,timestamptz,timestamptz) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- SECTION I: CREATE EVENT RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_event(
  p_project_id uuid,
  p_event jsonb,
  p_sessions jsonb DEFAULT '[]'::jsonb,
  p_product_type_ids uuid[] DEFAULT '{}'::uuid[],
  p_product_ids uuid[] DEFAULT '{}'::uuid[],
  p_policy_ids uuid[] DEFAULT '{}'::uuid[],
  p_voucher_ids uuid[] DEFAULT '{}'::uuid[],
  p_publish boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_slug text; v_title text; v_type text; v_status text;
        v_start timestamptz; v_end timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_project_manager(p_project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  v_title := trim(coalesce(p_event->>'title',''));
  v_slug := lower(trim(coalesce(p_event->>'slug','')));
  v_type := COALESCE(NULLIF(p_event->>'event_type',''),'other');
  IF v_title = '' THEN RAISE EXCEPTION 'invalid_event_dates' USING MESSAGE='title required'; END IF;
  IF v_slug = '' OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_slug) > 120 THEN
    RAISE EXCEPTION 'duplicate_event_slug' USING MESSAGE='invalid slug'; END IF;
  IF v_type NOT IN ('site_tour','sales_event','training','opening','customer_event','other','event','launch') THEN
    RAISE EXCEPTION 'invalid_event_type'; END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'duplicate_event_slug'; END IF;

  v_start := NULLIF(p_event->>'start_at','')::timestamptz;
  v_end := NULLIF(p_event->>'end_at','')::timestamptz;
  PERFORM public.validate_event_dates(
    NULLIF(p_event->>'registration_start','')::timestamptz,
    NULLIF(p_event->>'registration_deadline','')::timestamptz,
    v_start, v_end);
  PERFORM public.validate_event_location(
    COALESCE(NULLIF(p_event->>'location_type',''),'physical'),
    p_event->>'location_name', p_event->>'address_text',
    p_event->>'meeting_url',
    NULLIF(p_event->>'latitude','')::numeric,
    NULLIF(p_event->>'longitude','')::numeric);
  PERFORM public.validate_site_tour_details(v_type, COALESCE(p_event->'site_tour_details','{}'::jsonb));
  PERFORM public.validate_event_agenda(COALESCE(p_event->'agenda_json','[]'::jsonb));
  PERFORM public.validate_event_speakers(COALESCE(p_event->'speakers_json','[]'::jsonb));
  PERFORM public.validate_event_attachments(COALESCE(p_event->'attachments','[]'::jsonb));

  IF (p_event ? 'capacity') AND p_event->>'capacity' IS NOT NULL AND p_event->>'capacity' <> '' THEN
    IF (p_event->>'capacity')::int < 1 THEN RAISE EXCEPTION 'invalid_event_capacity'; END IF;
  END IF;
  IF (p_event ? 'per_user_limit') AND p_event->>'per_user_limit' IS NOT NULL AND p_event->>'per_user_limit' <> '' THEN
    IF (p_event->>'per_user_limit')::int < 1 THEN RAISE EXCEPTION 'invalid_event_capacity'; END IF;
  END IF;

  IF p_publish THEN
    IF v_start IS NULL OR v_end IS NULL THEN RAISE EXCEPTION 'invalid_event_dates'; END IF;
    IF v_end < now() THEN RAISE EXCEPTION 'event_expired'; END IF;
  END IF;

  v_status := CASE WHEN p_publish THEN 'active' ELSE 'draft' END;

  INSERT INTO public.events(
    project_id, title, slug, event_type, summary, content, location_type,
    location_name, address_text, meeting_url, latitude, longitude, location_notes,
    start_at, end_at, registration_start, registration_deadline,
    timezone, capacity, per_user_limit,
    agenda_json, speakers_json, attachments, site_tour_details,
    thumbnail_url, attachment_url, contact_phone,
    is_featured, priority, metadata, status, published_at, created_by, updated_by
  ) VALUES (
    p_project_id, v_title, v_slug, v_type,
    p_event->>'summary', p_event->>'content',
    COALESCE(NULLIF(p_event->>'location_type',''),'physical'),
    p_event->>'location_name', p_event->>'address_text',
    NULLIF(p_event->>'meeting_url',''),
    NULLIF(p_event->>'latitude','')::numeric,
    NULLIF(p_event->>'longitude','')::numeric,
    p_event->>'location_notes',
    v_start, v_end,
    NULLIF(p_event->>'registration_start','')::timestamptz,
    NULLIF(p_event->>'registration_deadline','')::timestamptz,
    COALESCE(NULLIF(p_event->>'timezone',''),'Asia/Ho_Chi_Minh'),
    NULLIF(p_event->>'capacity','')::int,
    COALESCE(NULLIF(p_event->>'per_user_limit','')::int, 1),
    COALESCE(p_event->'agenda_json','[]'::jsonb),
    COALESCE(p_event->'speakers_json','[]'::jsonb),
    COALESCE(p_event->'attachments','[]'::jsonb),
    COALESCE(p_event->'site_tour_details','{}'::jsonb),
    p_event->>'thumbnail_url', p_event->>'attachment_url', p_event->>'contact_phone',
    COALESCE((p_event->>'is_featured')::boolean, false),
    COALESCE(NULLIF(p_event->>'priority','')::int, 0),
    COALESCE(p_event->'metadata','{}'::jsonb),
    v_status,
    CASE WHEN p_publish THEN now() ELSE NULL END,
    auth.uid(), auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM public._apply_event_audience(v_id, p_project_id, p_product_type_ids, p_product_ids, p_policy_ids, p_voucher_ids);
  PERFORM public._apply_event_sessions(v_id, p_sessions, v_start, v_end);

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'create_event', 'events', v_id,
          jsonb_build_object('project_id', p_project_id, 'event_type', v_type, 'publish', p_publish,
                             'session_count', COALESCE(jsonb_array_length(p_sessions),0)));

  RETURN jsonb_build_object('event_id', v_id, 'slug', v_slug, 'event_type', v_type, 'status', v_status);
END $$;
REVOKE ALL ON FUNCTION public.create_event(uuid,jsonb,jsonb,uuid[],uuid[],uuid[],uuid[],boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_event(uuid,jsonb,jsonb,uuid[],uuid[],uuid[],uuid[],boolean) TO authenticated, service_role;

-- ============================================================
-- SECTION J: UPDATE EVENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_event(
  p_event_id uuid,
  p_event_patch jsonb,
  p_sessions jsonb DEFAULT NULL,
  p_product_type_ids uuid[] DEFAULT NULL,
  p_product_ids uuid[] DEFAULT NULL,
  p_policy_ids uuid[] DEFAULT NULL,
  p_voucher_ids uuid[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_new_slug text; v_new_type text; v_new_cap int; v_count int;
        v_new_start timestamptz; v_new_end timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RAISE EXCEPTION 'event_archived'; END IF;

  IF p_event_patch ? 'project_id' THEN RAISE EXCEPTION 'permission_denied'; END IF;

  v_new_slug := COALESCE(NULLIF(lower(trim(p_event_patch->>'slug')),''), v.slug);
  v_new_type := COALESCE(NULLIF(p_event_patch->>'event_type',''), v.event_type);
  IF v_new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_new_slug) > 120 THEN
    RAISE EXCEPTION 'duplicate_event_slug'; END IF;
  IF v_new_slug <> v.slug AND EXISTS (SELECT 1 FROM public.events WHERE slug = v_new_slug AND id <> p_event_id) THEN
    RAISE EXCEPTION 'duplicate_event_slug'; END IF;
  IF v_new_type NOT IN ('site_tour','sales_event','training','opening','customer_event','other','event','launch') THEN
    RAISE EXCEPTION 'invalid_event_type'; END IF;

  v_new_start := COALESCE(NULLIF(p_event_patch->>'start_at','')::timestamptz, v.start_at);
  v_new_end := COALESCE(NULLIF(p_event_patch->>'end_at','')::timestamptz, v.end_at);
  PERFORM public.validate_event_dates(
    COALESCE(NULLIF(p_event_patch->>'registration_start','')::timestamptz, v.registration_start),
    COALESCE(NULLIF(p_event_patch->>'registration_deadline','')::timestamptz, v.registration_deadline),
    v_new_start, v_new_end);
  PERFORM public.validate_event_location(
    COALESCE(NULLIF(p_event_patch->>'location_type',''), v.location_type),
    COALESCE(p_event_patch->>'location_name', v.location_name),
    COALESCE(p_event_patch->>'address_text', v.address_text),
    COALESCE(p_event_patch->>'meeting_url', v.meeting_url),
    COALESCE(NULLIF(p_event_patch->>'latitude','')::numeric, v.latitude),
    COALESCE(NULLIF(p_event_patch->>'longitude','')::numeric, v.longitude));
  PERFORM public.validate_site_tour_details(v_new_type,
    COALESCE(p_event_patch->'site_tour_details', v.site_tour_details));
  IF p_event_patch ? 'agenda_json' THEN PERFORM public.validate_event_agenda(p_event_patch->'agenda_json'); END IF;
  IF p_event_patch ? 'speakers_json' THEN PERFORM public.validate_event_speakers(p_event_patch->'speakers_json'); END IF;
  IF p_event_patch ? 'attachments' THEN PERFORM public.validate_event_attachments(p_event_patch->'attachments'); END IF;

  IF p_event_patch ? 'capacity' THEN
    v_new_cap := NULLIF(p_event_patch->>'capacity','')::int;
    IF v_new_cap IS NOT NULL AND v_new_cap < 1 THEN RAISE EXCEPTION 'invalid_event_capacity'; END IF;
    IF v_new_cap IS NOT NULL THEN
      v_count := public._event_registration_count(p_event_id);
      IF v_new_cap < v_count THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
    END IF;
  END IF;

  UPDATE public.events SET
    title = COALESCE(NULLIF(p_event_patch->>'title',''), title),
    slug = v_new_slug,
    event_type = v_new_type,
    summary = CASE WHEN p_event_patch ? 'summary' THEN p_event_patch->>'summary' ELSE summary END,
    content = CASE WHEN p_event_patch ? 'content' THEN p_event_patch->>'content' ELSE content END,
    location_type = COALESCE(NULLIF(p_event_patch->>'location_type',''), location_type),
    location_name = CASE WHEN p_event_patch ? 'location_name' THEN p_event_patch->>'location_name' ELSE location_name END,
    address_text = CASE WHEN p_event_patch ? 'address_text' THEN p_event_patch->>'address_text' ELSE address_text END,
    meeting_url = CASE WHEN p_event_patch ? 'meeting_url' THEN NULLIF(p_event_patch->>'meeting_url','') ELSE meeting_url END,
    latitude = CASE WHEN p_event_patch ? 'latitude' THEN NULLIF(p_event_patch->>'latitude','')::numeric ELSE latitude END,
    longitude = CASE WHEN p_event_patch ? 'longitude' THEN NULLIF(p_event_patch->>'longitude','')::numeric ELSE longitude END,
    location_notes = CASE WHEN p_event_patch ? 'location_notes' THEN p_event_patch->>'location_notes' ELSE location_notes END,
    start_at = v_new_start, end_at = v_new_end,
    registration_start = CASE WHEN p_event_patch ? 'registration_start' THEN NULLIF(p_event_patch->>'registration_start','')::timestamptz ELSE registration_start END,
    registration_deadline = CASE WHEN p_event_patch ? 'registration_deadline' THEN NULLIF(p_event_patch->>'registration_deadline','')::timestamptz ELSE registration_deadline END,
    timezone = COALESCE(NULLIF(p_event_patch->>'timezone',''), timezone),
    capacity = CASE WHEN p_event_patch ? 'capacity' THEN NULLIF(p_event_patch->>'capacity','')::int ELSE capacity END,
    per_user_limit = CASE WHEN p_event_patch ? 'per_user_limit' THEN COALESCE(NULLIF(p_event_patch->>'per_user_limit','')::int, per_user_limit) ELSE per_user_limit END,
    agenda_json = CASE WHEN p_event_patch ? 'agenda_json' THEN p_event_patch->'agenda_json' ELSE agenda_json END,
    speakers_json = CASE WHEN p_event_patch ? 'speakers_json' THEN p_event_patch->'speakers_json' ELSE speakers_json END,
    attachments = CASE WHEN p_event_patch ? 'attachments' THEN p_event_patch->'attachments' ELSE attachments END,
    site_tour_details = CASE WHEN p_event_patch ? 'site_tour_details' THEN p_event_patch->'site_tour_details' ELSE site_tour_details END,
    thumbnail_url = CASE WHEN p_event_patch ? 'thumbnail_url' THEN p_event_patch->>'thumbnail_url' ELSE thumbnail_url END,
    contact_phone = CASE WHEN p_event_patch ? 'contact_phone' THEN p_event_patch->>'contact_phone' ELSE contact_phone END,
    is_featured = CASE WHEN p_event_patch ? 'is_featured' THEN (p_event_patch->>'is_featured')::boolean ELSE is_featured END,
    priority = CASE WHEN p_event_patch ? 'priority' THEN COALESCE(NULLIF(p_event_patch->>'priority','')::int, priority) ELSE priority END,
    metadata = CASE WHEN p_event_patch ? 'metadata' THEN p_event_patch->'metadata' ELSE metadata END,
    updated_by = auth.uid(), updated_at = now()
  WHERE id = p_event_id;

  IF p_product_type_ids IS NOT NULL OR p_product_ids IS NOT NULL
     OR p_policy_ids IS NOT NULL OR p_voucher_ids IS NOT NULL THEN
    PERFORM public._apply_event_audience(p_event_id, v.project_id,
      COALESCE(p_product_type_ids, ARRAY(SELECT product_type_id FROM public.event_product_types WHERE event_id = p_event_id)),
      COALESCE(p_product_ids, ARRAY(SELECT product_id FROM public.event_products WHERE event_id = p_event_id)),
      COALESCE(p_policy_ids, ARRAY(SELECT policy_id FROM public.event_sales_policies WHERE event_id = p_event_id)),
      COALESCE(p_voucher_ids, ARRAY(SELECT voucher_id FROM public.event_vouchers WHERE event_id = p_event_id)));
  END IF;

  IF p_sessions IS NOT NULL THEN
    PERFORM public._apply_event_sessions(p_event_id, p_sessions, v_new_start, v_new_end);
  END IF;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(),'update_event','events',p_event_id,
          jsonb_build_object('changed_keys',(SELECT jsonb_agg(k) FROM jsonb_object_keys(p_event_patch) k)));
  RETURN jsonb_build_object('event_id',p_event_id,'changed',true);
END $$;
REVOKE ALL ON FUNCTION public.update_event(uuid,jsonb,jsonb,uuid[],uuid[],uuid[],uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_event(uuid,jsonb,jsonb,uuid[],uuid[],uuid[],uuid[]) TO authenticated, service_role;

-- ============================================================
-- SECTION K: PUBLISH / PAUSE / RESUME
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; c int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RAISE EXCEPTION 'event_archived'; END IF;
  IF v.status = 'cancelled' THEN RAISE EXCEPTION 'event_cancelled'; END IF;
  IF v.status = 'completed' THEN RAISE EXCEPTION 'event_completed'; END IF;
  IF v.status NOT IN ('draft','paused') THEN RAISE EXCEPTION 'event_not_active'; END IF;
  IF v.start_at IS NULL OR v.end_at IS NULL THEN RAISE EXCEPTION 'invalid_event_dates'; END IF;
  IF v.end_at < now() THEN RAISE EXCEPTION 'event_expired'; END IF;
  IF v.capacity IS NOT NULL THEN
    c := public._event_registration_count(p_event_id);
    IF c > v.capacity THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
  END IF;
  UPDATE public.events SET status='active', published_at = COALESCE(published_at, now()),
    updated_by = auth.uid(), updated_at = now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id)
  VALUES (auth.uid(),'publish_event','events',p_event_id);
  RETURN jsonb_build_object('event_id',p_event_id,'status','active');
END $$;
REVOKE ALL ON FUNCTION public.publish_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_event(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pause_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'event_not_active'; END IF;
  UPDATE public.events SET status='paused', updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id) VALUES (auth.uid(),'pause_event','events',p_event_id);
  RETURN jsonb_build_object('event_id',p_event_id,'status','paused');
END $$;
REVOKE ALL ON FUNCTION public.pause_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_event(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resume_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; c int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'paused' THEN RAISE EXCEPTION 'event_not_active'; END IF;
  IF v.end_at IS NOT NULL AND v.end_at < now() THEN RAISE EXCEPTION 'event_expired'; END IF;
  IF v.capacity IS NOT NULL THEN
    c := public._event_registration_count(p_event_id);
    IF c > v.capacity THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
  END IF;
  UPDATE public.events SET status='active', updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id) VALUES (auth.uid(),'resume_event','events',p_event_id);
  RETURN jsonb_build_object('event_id',p_event_id,'status','active');
END $$;
REVOKE ALL ON FUNCTION public.resume_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resume_event(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION L: CANCEL / COMPLETE
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_event(p_event_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RAISE EXCEPTION 'event_archived'; END IF;
  IF v.status = 'completed' THEN RAISE EXCEPTION 'event_completed'; END IF;
  UPDATE public.events SET status='cancelled', updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'cancel_event','events',p_event_id, jsonb_build_object('reason',p_reason));
  RETURN jsonb_build_object('event_id',p_event_id,'status','cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_event(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_event(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_event(p_event_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status NOT IN ('active','paused') THEN RAISE EXCEPTION 'event_not_active'; END IF;
  IF v.end_at IS NULL OR v.end_at > now() THEN RAISE EXCEPTION 'invalid_event_dates' USING MESSAGE='event not ended'; END IF;
  UPDATE public.events SET status='completed', updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'complete_event','events',p_event_id, jsonb_build_object('reason',p_reason));
  RETURN jsonb_build_object('event_id',p_event_id,'status','completed');
END $$;
REVOKE ALL ON FUNCTION public.complete_event(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_event(uuid,text) TO authenticated, service_role;

-- ============================================================
-- SECTION M: CLONE / ARCHIVE / RESTORE
-- ============================================================
CREATE OR REPLACE FUNCTION public.clone_event(
  p_event_id uuid, p_new_slug text, p_new_title text DEFAULT NULL,
  p_shift_start timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_new uuid; v_slug text; v_delta interval;
        v_new_start timestamptz; v_new_end timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  v_slug := lower(trim(coalesce(p_new_slug,'')));
  IF v_slug = '' OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'duplicate_event_slug'; END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE slug = v_slug) THEN RAISE EXCEPTION 'duplicate_event_slug'; END IF;

  IF p_shift_start IS NOT NULL AND v.start_at IS NOT NULL THEN
    v_delta := p_shift_start - v.start_at;
    v_new_start := p_shift_start;
    v_new_end := v.end_at + v_delta;
  ELSE
    v_new_start := v.start_at; v_new_end := v.end_at;
  END IF;

  INSERT INTO public.events(
    project_id, title, slug, event_type, summary, content, location_type,
    location_name, address_text, meeting_url, latitude, longitude, location_notes,
    start_at, end_at, registration_start, registration_deadline,
    timezone, capacity, per_user_limit,
    agenda_json, speakers_json, attachments, site_tour_details,
    thumbnail_url, contact_phone, priority, metadata,
    status, created_by, updated_by
  ) VALUES (
    v.project_id, COALESCE(p_new_title, v.title || ' (Bản sao)'),
    v_slug, v.event_type, v.summary, v.content, v.location_type,
    v.location_name, v.address_text, v.meeting_url, v.latitude, v.longitude, v.location_notes,
    v_new_start, v_new_end, NULL, NULL,
    v.timezone, v.capacity, v.per_user_limit,
    v.agenda_json, v.speakers_json, v.attachments, v.site_tour_details,
    v.thumbnail_url, v.contact_phone, v.priority, v.metadata,
    'draft', auth.uid(), auth.uid()
  ) RETURNING id INTO v_new;

  PERFORM public._apply_event_audience(v_new, v.project_id,
    ARRAY(SELECT product_type_id FROM public.event_product_types WHERE event_id = p_event_id),
    ARRAY(SELECT product_id FROM public.event_products WHERE event_id = p_event_id),
    ARRAY(SELECT policy_id FROM public.event_sales_policies WHERE event_id = p_event_id),
    ARRAY(SELECT voucher_id FROM public.event_vouchers WHERE event_id = p_event_id));

  -- Copy sessions with shift
  INSERT INTO public.event_sessions(event_id, title, description, starts_at, ends_at, location_text, display_order, metadata)
  SELECT v_new, title, description,
         starts_at + COALESCE(v_delta, interval '0'), ends_at + COALESCE(v_delta, interval '0'),
         location_text, display_order, metadata
  FROM public.event_sessions WHERE event_id = p_event_id;

  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'clone_event','events',v_new,
          jsonb_build_object('source_event_id',p_event_id,'shifted',(v_delta IS NOT NULL)));
  RETURN jsonb_build_object('event_id',v_new,'slug',v_slug,'status','draft');
END $$;
REVOKE ALL ON FUNCTION public.clone_event(uuid,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_event(uuid,text,text,timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.archive_event(p_event_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status = 'archived' OR v.archived_at IS NOT NULL THEN RAISE EXCEPTION 'event_archived'; END IF;
  UPDATE public.events SET status='archived', archived_at=now(),
    updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'archive_event','events',p_event_id, jsonb_build_object('reason',p_reason));
  RETURN jsonb_build_object('event_id',p_event_id,'status','archived');
END $$;
REVOKE ALL ON FUNCTION public.archive_event(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_event(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restore_event(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'archived' AND v.archived_at IS NULL THEN RAISE EXCEPTION 'event_not_archived'; END IF;
  UPDATE public.events SET status='draft', archived_at=NULL, published_at=NULL,
    updated_by=auth.uid(), updated_at=now() WHERE id = p_event_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id)
  VALUES (auth.uid(),'restore_event','events',p_event_id);
  RETURN jsonb_build_object('event_id',p_event_id,'status','draft');
END $$;
REVOKE ALL ON FUNCTION public.restore_event(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_event(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION N: CHECK EVENT ELIGIBILITY
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_event_eligibility(
  p_event_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_voucher_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_state text; v_count int; v_user_count int; v_remaining int;
        v_effective_pt uuid; v_product public.products%ROWTYPE; v_match boolean; n timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('eligible',false,'code','permission_denied','message','Chưa đăng nhập'); END IF;
  IF NOT public.is_active_user() THEN RETURN jsonb_build_object('eligible',false,'code','permission_denied','message','Tài khoản không hoạt động'); END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id;
  IF v IS NULL THEN RETURN jsonb_build_object('eligible',false,'code','not_found','message','Không tìm thấy'); END IF;

  v_count := public._event_registration_count(p_event_id);
  v_state := public.event_derived_state(p_event_id);
  v_remaining := CASE WHEN v.capacity IS NULL THEN NULL ELSE greatest(0, v.capacity - v_count) END;
  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE event_id = p_event_id AND registration_type IN ('event','site_tour')
      AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed');

  IF v_state = 'archived' THEN RETURN jsonb_build_object('eligible',false,'code','event_archived','message','Sự kiện đã lưu trữ','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'draft' THEN RETURN jsonb_build_object('eligible',false,'code','event_not_active','message','Sự kiện chưa phát hành','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'paused' THEN RETURN jsonb_build_object('eligible',false,'code','event_paused','message','Sự kiện đang tạm dừng','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'cancelled' THEN RETURN jsonb_build_object('eligible',false,'code','event_cancelled','message','Sự kiện đã bị huỷ','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'completed' THEN RETURN jsonb_build_object('eligible',false,'code','event_completed','message','Sự kiện đã kết thúc','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'upcoming_registration' THEN RETURN jsonb_build_object('eligible',false,'code','event_registration_not_open','message','Chưa mở đăng ký','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'registration_closed' THEN RETURN jsonb_build_object('eligible',false,'code','event_registration_closed','message','Đã đóng đăng ký','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'full' THEN RETURN jsonb_build_object('eligible',false,'code','event_full','message','Sự kiện đã đầy','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',0,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_state = 'ongoing' AND v.registration_deadline IS NOT NULL AND v.registration_deadline < n THEN
    RETURN jsonb_build_object('eligible',false,'code','event_registration_closed','message','Đã đóng đăng ký','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v.end_at IS NOT NULL AND v.end_at < n THEN RETURN jsonb_build_object('eligible',false,'code','event_expired','message','Sự kiện đã kết thúc','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;
  IF v_user_count >= v.per_user_limit THEN
    RETURN jsonb_build_object('eligible',false,'code','event_user_limit_reached','message','Đã đạt giới hạn cá nhân','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;

  v_effective_pt := p_product_type_id;
  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
    IF v_product IS NULL OR v_product.project_id <> v.project_id THEN
      RETURN jsonb_build_object('eligible',false,'code','event_not_applicable','message','Sản phẩm không thuộc dự án','derived_state',v_state,'event_type',v.event_type); END IF;
    v_effective_pt := COALESCE(v_effective_pt, v_product.product_type_id);
  END IF;

  IF v.applicability_scope = 'project_wide' THEN v_match := true;
  ELSE
    v_match :=
      (v_effective_pt IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_product_types WHERE event_id = p_event_id AND product_type_id = v_effective_pt))
      OR (p_product_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_products WHERE event_id = p_event_id AND product_id = p_product_id))
      OR (p_policy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_sales_policies WHERE event_id = p_event_id AND policy_id = p_policy_id))
      OR (p_voucher_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.event_vouchers WHERE event_id = p_event_id AND voucher_id = p_voucher_id));
    IF NOT v_match
       AND NOT EXISTS (SELECT 1 FROM public.event_product_types WHERE event_id = p_event_id)
       AND NOT EXISTS (SELECT 1 FROM public.event_products WHERE event_id = p_event_id)
       AND NOT EXISTS (SELECT 1 FROM public.event_sales_policies WHERE event_id = p_event_id)
       AND NOT EXISTS (SELECT 1 FROM public.event_vouchers WHERE event_id = p_event_id) THEN
      v_match := true; END IF;
  END IF;
  IF NOT v_match THEN
    RETURN jsonb_build_object('eligible',false,'code','event_not_applicable','message','Không thuộc phạm vi áp dụng','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND COALESCE(full_name,'') <> '' AND COALESCE(phone,'') <> '') THEN
    RETURN jsonb_build_object('eligible',false,'code','event_profile_incomplete','message','Cần cập nhật họ tên & số điện thoại','derived_state',v_state,'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type); END IF;

  RETURN jsonb_build_object('eligible',true,'code','ok','message','Đủ điều kiện','derived_state',v_state,
    'capacity',v.capacity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count,'event_type',v.event_type);
END $$;
REVOKE ALL ON FUNCTION public.check_event_eligibility(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_event_eligibility(uuid,uuid,uuid,uuid,uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION O: REGISTER FOR EVENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_voucher_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_prof public.profiles%ROWTYPE; v_lead_id uuid;
        v_reg_id uuid; v_reg_code text; v_count int; v_user_count int;
        v_elig jsonb; v_source_id uuid; v_reg_type text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  -- Advisory lock — use event id and different seed than voucher lock
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text, 43));

  SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;

  v_elig := public.check_event_eligibility(p_event_id, p_product_id, p_product_type_id, p_policy_id, p_voucher_id);
  IF NOT (v_elig->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', v_elig->>'code'; END IF;

  v_count := public._event_registration_count(p_event_id);
  IF v.capacity IS NOT NULL AND v_count >= v.capacity THEN RAISE EXCEPTION 'event_full'; END IF;

  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE event_id = p_event_id AND registration_type IN ('event','site_tour')
      AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed');
  IF v_user_count >= v.per_user_limit THEN RAISE EXCEPTION 'event_user_limit_reached'; END IF;
  IF v.per_user_limit = 1 AND EXISTS (SELECT 1 FROM public.registrations WHERE event_id = p_event_id
      AND registration_type IN ('event','site_tour') AND created_by = auth.uid()
      AND status IN ('new','in_progress','confirmed','completed')) THEN
    RAISE EXCEPTION 'duplicate_event_registration'; END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = auth.uid();
  IF v_prof IS NULL OR COALESCE(v_prof.full_name,'') = '' OR COALESCE(v_prof.phone,'') = '' THEN
    RAISE EXCEPTION 'event_profile_incomplete'; END IF;

  SELECT id INTO v_source_id FROM public.lead_sources WHERE code = 'app' LIMIT 1;
  SELECT id INTO v_lead_id FROM public.leads
    WHERE normalized_phone = public.normalize_phone(v_prof.phone)
    ORDER BY created_at DESC LIMIT 1;
  IF v_lead_id IS NULL THEN
    INSERT INTO public.leads(full_name, phone, email, source_id, interested_project_id,
                             interested_product_id, created_by, status, priority)
    VALUES (v_prof.full_name, v_prof.phone, NULL, v_source_id, v.project_id,
            p_product_id, auth.uid(), 'new', 'normal')
    RETURNING id INTO v_lead_id;
  END IF;

  -- Choose canonical registration type: use 'event' for all Event Engine registrations,
  -- keep 'site_tour' for site_tour subtype to preserve mobile compatibility.
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
REVOKE ALL ON FUNCTION public.register_for_event(uuid,uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_event(uuid,uuid,uuid,uuid,uuid,text) TO authenticated, service_role;

-- ============================================================
-- SECTION P: CANCEL MY EVENT REGISTRATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_my_event_registration(p_registration_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.registrations%ROWTYPE; e public.events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF r.created_by <> auth.uid() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF r.registration_type NOT IN ('event','site_tour') THEN RAISE EXCEPTION 'registration_not_cancellable'; END IF;
  IF r.status NOT IN ('new','in_progress') THEN RAISE EXCEPTION 'registration_not_cancellable'; END IF;
  IF r.event_id IS NOT NULL THEN
    SELECT * INTO e FROM public.events WHERE id = r.event_id;
    IF e.status IN ('completed','archived') OR e.archived_at IS NOT NULL THEN
      RAISE EXCEPTION 'registration_not_cancellable'; END IF;
    IF e.start_at IS NOT NULL AND e.start_at <= now() THEN
      RAISE EXCEPTION 'registration_not_cancellable' USING MESSAGE='event started'; END IF;
  END IF;
  UPDATE public.registrations SET status='cancelled', updated_at=now() WHERE id = p_registration_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id)
  VALUES (auth.uid(),'cancel_event_registration','registrations',p_registration_id);
  RETURN jsonb_build_object('registration_id',p_registration_id,'status','cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_my_event_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_event_registration(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION Q: ADMIN DETAIL & SEARCH
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_event_admin_detail(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_count int; v_state text; v_pending int; v_confirmed int; v_cancelled int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (public.is_project_manager(v.project_id) OR public.is_project_member(v.project_id)
          OR public.has_any_role(ARRAY['super_admin','admin','director'])) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  v_count := public._event_registration_count(p_event_id);
  v_state := public.event_derived_state(p_event_id);
  SELECT count(*) FILTER (WHERE status IN ('new','in_progress')),
         count(*) FILTER (WHERE status IN ('confirmed','completed')),
         count(*) FILTER (WHERE status IN ('cancelled','no_show'))
    INTO v_pending, v_confirmed, v_cancelled
    FROM public.registrations WHERE event_id = p_event_id AND registration_type IN ('event','site_tour');

  RETURN jsonb_build_object(
    'event', to_jsonb(v),
    'derived_state', v_state,
    'project', (SELECT to_jsonb(p) FROM public.projects p WHERE p.id = v.project_id),
    'sessions', COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.starts_at, s.display_order, s.id)
      FROM public.event_sessions s WHERE s.event_id = p_event_id), '[]'::jsonb),
    'product_types', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pt.id,'name',pt.name,'code',pt.code) ORDER BY pt.name)
      FROM public.event_product_types e JOIN public.product_types pt ON pt.id = e.product_type_id
      WHERE e.event_id = p_event_id), '[]'::jsonb),
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'product_code',p.product_code,'product_name',p.product_name) ORDER BY p.product_code)
      FROM public.event_products e JOIN public.products p ON p.id = e.product_id WHERE e.event_id = p_event_id), '[]'::jsonb),
    'policies', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',sp.id,'title',sp.title,'slug',sp.slug) ORDER BY sp.title)
      FROM public.event_sales_policies e JOIN public.sales_policies sp ON sp.id = e.policy_id WHERE e.event_id = p_event_id), '[]'::jsonb),
    'vouchers', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v2.id,'title',v2.title,'slug',v2.slug,'code',v2.code) ORDER BY v2.title)
      FROM public.event_vouchers e JOIN public.vouchers v2 ON v2.id = e.voucher_id WHERE e.event_id = p_event_id), '[]'::jsonb),
    'capacity_stats', jsonb_build_object('capacity',v.capacity,'registration_count',v_count,
      'remaining', CASE WHEN v.capacity IS NULL THEN NULL ELSE greatest(0, v.capacity - v_count) END),
    'registration_stats', jsonb_build_object('pending',v_pending,'confirmed',v_confirmed,'cancelled',v_cancelled),
    'permissions', jsonb_build_object('can_manage', public.is_project_manager(v.project_id))
  );
END $$;
REVOKE ALL ON FUNCTION public.get_event_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_admin_detail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_events(
  p_project_id uuid, p_query text DEFAULT NULL, p_event_type text DEFAULT NULL,
  p_status text DEFAULT NULL, p_derived_state text DEFAULT NULL,
  p_featured boolean DEFAULT NULL,
  p_starts_from timestamptz DEFAULT NULL, p_starts_to timestamptz DEFAULT NULL,
  p_include_archived boolean DEFAULT false,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_total int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_project_manager(p_project_id) OR public.is_project_member(p_project_id)
          OR public.has_any_role(ARRAY['super_admin','admin','director'])) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  WITH filtered AS (
    SELECT e.*, public._event_registration_count(e.id) AS reg_count,
           public.event_derived_state(e.id) AS derived_state,
           (SELECT count(*) FROM public.event_product_types WHERE event_id = e.id) AS pt_count,
           (SELECT count(*) FROM public.event_products WHERE event_id = e.id) AS p_count,
           (SELECT count(*) FROM public.event_sales_policies WHERE event_id = e.id) AS pol_count,
           (SELECT count(*) FROM public.event_vouchers WHERE event_id = e.id) AS vo_count
    FROM public.events e
    WHERE e.project_id = p_project_id
      AND (p_include_archived OR (e.archived_at IS NULL AND e.status <> 'archived'))
      AND (p_event_type IS NULL OR e.event_type = p_event_type)
      AND (p_status IS NULL OR e.status = p_status)
      AND (p_featured IS NULL OR e.is_featured = p_featured)
      AND (p_starts_from IS NULL OR e.start_at >= p_starts_from)
      AND (p_starts_to IS NULL OR e.start_at <= p_starts_to)
      AND (p_query IS NULL OR p_query = ''
           OR e.title ILIKE '%'||p_query||'%'
           OR e.slug ILIKE '%'||p_query||'%'
           OR COALESCE(e.summary,'') ILIKE '%'||p_query||'%'
           OR COALESCE(e.location_name,'') ILIKE '%'||p_query||'%'
           OR COALESCE(e.address_text,'') ILIKE '%'||p_query||'%')
  ), stated AS (
    SELECT * FROM filtered WHERE p_derived_state IS NULL OR derived_state = p_derived_state
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'slug',slug,'event_type',event_type,'status',status,'derived_state',derived_state,
    'registration_start',registration_start,'registration_deadline',registration_deadline,
    'start_at',start_at,'end_at',end_at,'timezone',timezone,
    'location_type',location_type,'location_name',location_name,'address_text',address_text,
    'capacity',capacity,'registration_count',reg_count,
    'remaining', CASE WHEN capacity IS NULL THEN NULL ELSE greatest(0, capacity - reg_count) END,
    'pt_count',pt_count,'p_count',p_count,'pol_count',pol_count,'vo_count',vo_count,
    'applicability_scope',applicability_scope,
    'is_featured',is_featured,'priority',priority,'updated_at',updated_at
  ) ORDER BY start_at ASC NULLS LAST, priority DESC, updated_at DESC, id), '[]'::jsonb)
    INTO v_rows
    FROM (SELECT * FROM stated ORDER BY start_at ASC NULLS LAST, priority DESC, updated_at DESC, id
          LIMIT p_limit OFFSET p_offset) x;
  SELECT count(*) INTO v_total FROM stated;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $$;
REVOKE ALL ON FUNCTION public.search_events(uuid,text,text,text,text,boolean,timestamptz,timestamptz,boolean,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_events(uuid,text,text,text,text,boolean,timestamptz,timestamptz,boolean,int,int) TO authenticated, service_role;

-- ============================================================
-- SECTION R: MOBILE ACTIVE EVENTS
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_project_events(
  p_project_id uuid, p_event_type text DEFAULT NULL,
  p_product_id uuid DEFAULT NULL, p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL, p_voucher_id uuid DEFAULT NULL,
  p_starts_from timestamptz DEFAULT NULL, p_starts_to timestamptz DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;

  WITH es AS (
    SELECT e.*, public._event_registration_count(e.id) AS reg_count,
           public.event_derived_state(e.id) AS derived_state
    FROM public.events e
    WHERE e.project_id = p_project_id
      AND e.archived_at IS NULL
      AND e.status = 'active'
      AND e.published_at IS NOT NULL
      AND (p_event_type IS NULL OR e.event_type = p_event_type)
      AND (p_starts_from IS NULL OR e.start_at >= p_starts_from)
      AND (p_starts_to IS NULL OR e.start_at <= p_starts_to)
  ), applied AS (
    SELECT es.* FROM es
    WHERE es.applicability_scope = 'project_wide'
       OR (p_product_type_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.event_product_types x WHERE x.event_id = es.id AND x.product_type_id = p_product_type_id))
       OR (p_product_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.event_products x WHERE x.event_id = es.id AND x.product_id = p_product_id))
       OR (p_policy_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.event_sales_policies x WHERE x.event_id = es.id AND x.policy_id = p_policy_id))
       OR (p_voucher_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.event_vouchers x WHERE x.event_id = es.id AND x.voucher_id = p_voucher_id))
       OR (p_product_id IS NULL AND p_product_type_id IS NULL AND p_policy_id IS NULL AND p_voucher_id IS NULL)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'slug',slug,'event_type',event_type,'summary',summary,
    'start_at',start_at,'end_at',end_at,'timezone',timezone,
    'location_type',location_type,'location_name',location_name,'address_text',address_text,
    'meeting_url',meeting_url,'latitude',latitude,'longitude',longitude,
    'thumbnail_url',thumbnail_url,'is_featured',is_featured,'priority',priority,
    'derived_state',derived_state,'capacity',capacity,'registration_count',reg_count,
    'remaining', CASE WHEN capacity IS NULL THEN NULL ELSE greatest(0, capacity - reg_count) END,
    'user_registration_count',(SELECT count(*) FROM public.registrations r
      WHERE r.event_id = applied.id AND r.registration_type IN ('event','site_tour')
        AND r.created_by = auth.uid() AND r.status IN ('new','in_progress','confirmed','completed'))
  ) ORDER BY is_featured DESC, start_at ASC NULLS LAST, priority DESC, id), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM applied ORDER BY is_featured DESC, start_at ASC NULLS LAST, priority DESC, id
        LIMIT p_limit OFFSET p_offset) applied;

  RETURN jsonb_build_object('rows', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.get_active_project_events(uuid,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_project_events(uuid,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_event_detail(
  p_event_id uuid, p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL, p_policy_id uuid DEFAULT NULL,
  p_voucher_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.events%ROWTYPE; v_count int; v_elig jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.events WHERE id = p_event_id;
  IF v IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF v.archived_at IS NOT NULL OR v.status IN ('archived','draft') THEN
    RAISE EXCEPTION 'event_not_active'; END IF;

  v_count := public._event_registration_count(p_event_id);
  v_elig := public.check_event_eligibility(p_event_id, p_product_id, p_product_type_id, p_policy_id, p_voucher_id);

  RETURN jsonb_build_object(
    'event', jsonb_build_object(
      'id',v.id,'title',v.title,'slug',v.slug,'event_type',v.event_type,
      'summary',v.summary,'content',v.content,
      'start_at',v.start_at,'end_at',v.end_at,'timezone',v.timezone,
      'registration_start',v.registration_start,'registration_deadline',v.registration_deadline,
      'location_type',v.location_type,'location_name',v.location_name,'address_text',v.address_text,
      'meeting_url',v.meeting_url,'latitude',v.latitude,'longitude',v.longitude,'location_notes',v.location_notes,
      'agenda',v.agenda_json,'speakers',v.speakers_json,'attachments',v.attachments,
      'site_tour_details', CASE WHEN v.event_type='site_tour' THEN v.site_tour_details ELSE '{}'::jsonb END,
      'thumbnail_url',v.thumbnail_url,'contact_phone',v.contact_phone,
      'capacity',v.capacity,'per_user_limit',v.per_user_limit,
      'is_featured',v.is_featured,'applicability_scope',v.applicability_scope),
    'sessions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',s.id,'title',s.title,'description',s.description,'starts_at',s.starts_at,
      'ends_at',s.ends_at,'location_text',s.location_text,'display_order',s.display_order)
      ORDER BY s.starts_at, s.display_order, s.id) FROM public.event_sessions s WHERE s.event_id = p_event_id), '[]'::jsonb),
    'derived_state', public.event_derived_state(p_event_id),
    'capacity_stats', jsonb_build_object('capacity',v.capacity,'registration_count',v_count,
      'remaining', CASE WHEN v.capacity IS NULL THEN NULL ELSE greatest(0, v.capacity - v_count) END),
    'eligibility', v_elig,
    'my_registrations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',r.id,'registration_code',r.registration_code,'status',r.status,'created_at',r.created_at))
      FROM public.registrations r WHERE r.event_id = p_event_id AND r.created_by = auth.uid()), '[]'::jsonb),
    'project', (SELECT jsonb_build_object('id',p.id,'name',p.name,'code',p.code) FROM public.projects p WHERE p.id = v.project_id)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_active_event_detail(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_event_detail(uuid,uuid,uuid,uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_event_registrations(
  p_project_id uuid DEFAULT NULL, p_event_type text DEFAULT NULL,
  p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'registration_code', r.registration_code, 'status', r.status, 'created_at', r.created_at,
    'event', jsonb_build_object('id',e.id,'title',e.title,'event_type',e.event_type,
      'start_at',e.start_at,'end_at',e.end_at,
      'location_type',e.location_type,'location_name',e.location_name,'address_text',e.address_text),
    'project', jsonb_build_object('id',p.id,'name',p.name,'code',p.code),
    'product', CASE WHEN pr.id IS NULL THEN NULL
                    ELSE jsonb_build_object('id',pr.id,'product_code',pr.product_code,'product_name',pr.product_name) END,
    'can_cancel', (r.status IN ('new','in_progress')
                   AND e.status NOT IN ('completed','archived')
                   AND (e.start_at IS NULL OR e.start_at > now()))
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM public.registrations
        WHERE registration_type IN ('event','site_tour') AND created_by = auth.uid()
          AND (p_project_id IS NULL OR project_id = p_project_id)
          AND (p_status IS NULL OR status = p_status)
        ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset) r
  LEFT JOIN public.events e ON e.id = r.event_id
  LEFT JOIN public.projects p ON p.id = r.project_id
  LEFT JOIN public.products pr ON pr.id = r.product_id
  WHERE (p_event_type IS NULL OR e.event_type = p_event_type);

  RETURN jsonb_build_object('rows', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.get_my_event_registrations(uuid,text,text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_event_registrations(uuid,text,text,int,int) TO authenticated, service_role;
