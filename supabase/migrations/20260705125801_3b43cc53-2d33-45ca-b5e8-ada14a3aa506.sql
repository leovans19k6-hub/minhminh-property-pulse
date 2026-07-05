
-- ============================================================
-- PHASE 6B — VOUCHER MANAGEMENT + ELIGIBILITY + REGISTRATION FOUNDATION
-- ============================================================

-- ============================================================
-- SECTION A: Additive schema on vouchers
-- ============================================================
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS benefits_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS conditions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS applicability_scope text NOT NULL DEFAULT 'project_wide',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_limit integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS registration_start timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- Applicability scope constraint
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_applicability_scope_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_applicability_scope_check
  CHECK (applicability_scope IN ('project_wide','product_types','specific_products','sales_policies','mixed'));

-- Status: extend allowed to include 'paused'
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_status_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_status_check
  CHECK (status IN ('draft','active','paused','archived','inactive'));

-- Unique voucher code per project (case-insensitive) when present
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_project_code_uidx
  ON public.vouchers (project_id, lower(code)) WHERE code IS NOT NULL;

-- Sensible ranges
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_per_user_limit_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_per_user_limit_check
  CHECK (per_user_limit >= 1);

ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_quantity_check;
ALTER TABLE public.vouchers ADD CONSTRAINT vouchers_quantity_check
  CHECK (quantity IS NULL OR quantity >= 1);

-- ============================================================
-- SECTION B: Applicability relation tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.voucher_product_types (
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  product_type_id uuid NOT NULL REFERENCES public.product_types(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (voucher_id, product_type_id)
);
GRANT SELECT ON public.voucher_product_types TO authenticated;
GRANT ALL ON public.voucher_product_types TO service_role;
ALTER TABLE public.voucher_product_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voucher_product_types_read ON public.voucher_product_types;
CREATE POLICY voucher_product_types_read ON public.voucher_product_types FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS voucher_product_types_no_write ON public.voucher_product_types;
CREATE POLICY voucher_product_types_no_write ON public.voucher_product_types FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS voucher_product_types_pt_idx ON public.voucher_product_types(product_type_id);

CREATE TABLE IF NOT EXISTS public.voucher_products (
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (voucher_id, product_id)
);
GRANT SELECT ON public.voucher_products TO authenticated;
GRANT ALL ON public.voucher_products TO service_role;
ALTER TABLE public.voucher_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voucher_products_read ON public.voucher_products;
CREATE POLICY voucher_products_read ON public.voucher_products FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS voucher_products_no_write ON public.voucher_products;
CREATE POLICY voucher_products_no_write ON public.voucher_products FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS voucher_products_product_idx ON public.voucher_products(product_id);

CREATE TABLE IF NOT EXISTS public.voucher_sales_policies (
  voucher_id uuid NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  policy_id uuid NOT NULL REFERENCES public.sales_policies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (voucher_id, policy_id)
);
GRANT SELECT ON public.voucher_sales_policies TO authenticated;
GRANT ALL ON public.voucher_sales_policies TO service_role;
ALTER TABLE public.voucher_sales_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS voucher_sales_policies_read ON public.voucher_sales_policies;
CREATE POLICY voucher_sales_policies_read ON public.voucher_sales_policies FOR SELECT TO authenticated
  USING (public.is_active_user());
DROP POLICY IF EXISTS voucher_sales_policies_no_write ON public.voucher_sales_policies;
CREATE POLICY voucher_sales_policies_no_write ON public.voucher_sales_policies FOR ALL TO authenticated
  USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS voucher_sales_policies_policy_idx ON public.voucher_sales_policies(policy_id);

-- ============================================================
-- SECTION C: RLS hardening on vouchers (deny direct writes)
-- ============================================================
DROP POLICY IF EXISTS vouchers_manage ON public.vouchers;
DROP POLICY IF EXISTS vouchers_read ON public.vouchers;
CREATE POLICY vouchers_read ON public.vouchers FOR SELECT TO authenticated
  USING (public.is_active_user());
CREATE POLICY vouchers_deny_write ON public.vouchers FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- ============================================================
-- SECTION D: Tighten registrations insert (block direct voucher inserts)
-- ============================================================
DROP POLICY IF EXISTS registrations_insert ON public.registrations;
CREATE POLICY registrations_insert ON public.registrations FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND registration_type <> 'voucher');

-- ============================================================
-- SECTION E: Validation helpers (SECURITY DEFINER internal)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_voucher_benefits(p_benefits jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb; v_type text; v_val numeric;
BEGIN
  IF p_benefits IS NULL OR jsonb_typeof(p_benefits) <> 'array' THEN
    RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
  IF jsonb_array_length(p_benefits) > 30 THEN RAISE EXCEPTION 'too_many_voucher_benefits'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_benefits) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'duplicate_voucher_benefit_id'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'title','') = '' OR length(v->>'title') > 200 THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
    IF v ? 'description' AND length(v->>'description') > 2000 THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
    v_type := COALESCE(v->>'value_type','other');
    IF v_type NOT IN ('percentage','fixed_amount','gift','service','other') THEN
      RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
    IF v ? 'value' AND v->>'value' IS NOT NULL AND v->>'value' <> '' THEN
      BEGIN v_val := (v->>'value')::numeric; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END;
      IF v_type = 'percentage' AND (v_val < 0 OR v_val > 100) THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
      IF v_type = 'fixed_amount' AND v_val < 0 THEN RAISE EXCEPTION 'invalid_voucher_benefits'; END IF;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_voucher_conditions(p_conditions jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb;
BEGIN
  IF p_conditions IS NULL OR jsonb_typeof(p_conditions) <> 'array' THEN
    RAISE EXCEPTION 'invalid_voucher_conditions'; END IF;
  IF jsonb_array_length(p_conditions) > 50 THEN RAISE EXCEPTION 'too_many_voucher_conditions'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_conditions) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_voucher_conditions'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'duplicate_voucher_condition_id'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'title','') = '' OR length(v->>'title') > 200 THEN RAISE EXCEPTION 'invalid_voucher_conditions'; END IF;
    IF v ? 'description' AND length(v->>'description') > 2000 THEN RAISE EXCEPTION 'invalid_voucher_conditions'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_voucher_attachments(p_attachments jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v jsonb; v_id text; v_seen jsonb := '{}'::jsonb; v_url text; v_type text;
BEGIN
  IF p_attachments IS NULL OR jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
  IF jsonb_array_length(p_attachments) > 20 THEN RAISE EXCEPTION 'too_many_voucher_attachments'; END IF;
  FOR v IN SELECT * FROM jsonb_array_elements(p_attachments) LOOP
    v_id := v->>'id';
    IF v_id IS NULL OR length(v_id) = 0 THEN RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
    IF v_seen ? v_id THEN RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
    v_seen := v_seen || jsonb_build_object(v_id, true);
    IF COALESCE(v->>'label','') = '' THEN RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
    v_url := v->>'url';
    IF v_url IS NULL OR NOT (v_url ~* '^https?://') THEN RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
    v_type := COALESCE(v->>'type','link');
    IF v_type NOT IN ('pdf','image','document','spreadsheet','link') THEN RAISE EXCEPTION 'invalid_voucher_attachment'; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_voucher_dates(
  p_registration_start timestamptz, p_registration_deadline timestamptz,
  p_valid_from timestamptz, p_valid_to timestamptz)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
BEGIN
  IF p_registration_start IS NOT NULL AND p_registration_deadline IS NOT NULL
     AND p_registration_deadline < p_registration_start THEN
    RAISE EXCEPTION 'invalid_voucher_dates'; END IF;
  IF p_valid_from IS NOT NULL AND p_valid_to IS NOT NULL AND p_valid_to < p_valid_from THEN
    RAISE EXCEPTION 'invalid_voucher_dates'; END IF;
END $$;

-- ============================================================
-- SECTION F: Derived state helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.voucher_derived_state(v public.vouchers, p_reg_count int)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE n timestamptz := now();
BEGIN
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RETURN 'archived'; END IF;
  IF v.status = 'draft' THEN RETURN 'draft'; END IF;
  IF v.status = 'paused' THEN RETURN 'paused'; END IF;
  IF v.status IN ('active','inactive') THEN
    IF v.valid_to IS NOT NULL AND v.valid_to < n THEN RETURN 'expired'; END IF;
    IF v.registration_start IS NOT NULL AND v.registration_start > n THEN RETURN 'upcoming_registration'; END IF;
    IF v.registration_deadline IS NOT NULL AND v.registration_deadline < n THEN
      IF v.valid_from IS NOT NULL AND v.valid_from > n THEN RETURN 'upcoming_validity';
      ELSE RETURN 'registration_closed'; END IF;
    END IF;
    IF v.quantity IS NOT NULL AND p_reg_count >= v.quantity THEN RETURN 'full'; END IF;
    IF v.valid_from IS NOT NULL AND v.valid_from > n THEN RETURN 'upcoming_validity'; END IF;
    RETURN 'open';
  END IF;
  RETURN v.status;
END $$;

-- valid_from/valid_to compatibility: schema uses effective_from/effective_to;
-- treat effective_from as valid_from and effective_to as valid_to for derived state.
CREATE OR REPLACE FUNCTION public.voucher_derived_state(p_voucher_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; c int; n timestamptz := now();
BEGIN
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v IS NULL THEN RETURN NULL; END IF;
  SELECT count(*) INTO c FROM public.registrations
    WHERE voucher_id = p_voucher_id AND registration_type = 'voucher'
      AND status IN ('new','in_progress','confirmed','completed');
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RETURN 'archived'; END IF;
  IF v.status = 'draft' THEN RETURN 'draft'; END IF;
  IF v.status = 'paused' THEN RETURN 'paused'; END IF;
  IF v.status IN ('active','inactive') THEN
    IF v.effective_to IS NOT NULL AND v.effective_to < n THEN RETURN 'expired'; END IF;
    IF v.registration_start IS NOT NULL AND v.registration_start > n THEN RETURN 'upcoming_registration'; END IF;
    IF v.registration_deadline IS NOT NULL AND v.registration_deadline < n THEN
      IF v.effective_from IS NOT NULL AND v.effective_from > n THEN RETURN 'upcoming_validity';
      ELSE RETURN 'registration_closed'; END IF;
    END IF;
    IF v.quantity IS NOT NULL AND c >= v.quantity THEN RETURN 'full'; END IF;
    IF v.effective_from IS NOT NULL AND v.effective_from > n THEN RETURN 'upcoming_validity'; END IF;
    RETURN 'open';
  END IF;
  RETURN v.status;
END $$;

-- ============================================================
-- SECTION G: Applicability applier (internal)
-- ============================================================
CREATE OR REPLACE FUNCTION public._apply_voucher_applicability(
  p_voucher_id uuid, p_project_id uuid,
  p_product_type_ids uuid[], p_product_ids uuid[], p_policy_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pt uuid; v_p uuid; v_pol uuid; v_scope text;
BEGIN
  -- Validate cross-project references
  IF p_product_type_ids IS NOT NULL THEN
    FOREACH v_pt IN ARRAY p_product_type_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.product_types
        WHERE id = v_pt AND (project_id IS NULL OR project_id = p_project_id)) THEN
        RAISE EXCEPTION 'invalid_voucher_product_type'; END IF;
    END LOOP;
  END IF;
  IF p_product_ids IS NOT NULL THEN
    FOREACH v_p IN ARRAY p_product_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_p AND project_id = p_project_id) THEN
        RAISE EXCEPTION 'invalid_voucher_product'; END IF;
    END LOOP;
  END IF;
  IF p_policy_ids IS NOT NULL THEN
    FOREACH v_pol IN ARRAY p_policy_ids LOOP
      IF NOT EXISTS (SELECT 1 FROM public.sales_policies WHERE id = v_pol AND project_id = p_project_id) THEN
        RAISE EXCEPTION 'invalid_voucher_policy'; END IF;
    END LOOP;
  END IF;

  DELETE FROM public.voucher_product_types WHERE voucher_id = p_voucher_id;
  DELETE FROM public.voucher_products WHERE voucher_id = p_voucher_id;
  DELETE FROM public.voucher_sales_policies WHERE voucher_id = p_voucher_id;

  IF p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids,1) > 0 THEN
    INSERT INTO public.voucher_product_types(voucher_id, product_type_id)
    SELECT p_voucher_id, unnest(p_product_type_ids) ON CONFLICT DO NOTHING;
  END IF;
  IF p_product_ids IS NOT NULL AND array_length(p_product_ids,1) > 0 THEN
    INSERT INTO public.voucher_products(voucher_id, product_id)
    SELECT p_voucher_id, unnest(p_product_ids) ON CONFLICT DO NOTHING;
  END IF;
  IF p_policy_ids IS NOT NULL AND array_length(p_policy_ids,1) > 0 THEN
    INSERT INTO public.voucher_sales_policies(voucher_id, policy_id)
    SELECT p_voucher_id, unnest(p_policy_ids) ON CONFLICT DO NOTHING;
  END IF;

  -- Compute applicability_scope
  IF (p_product_type_ids IS NULL OR array_length(p_product_type_ids,1) IS NULL)
     AND (p_product_ids IS NULL OR array_length(p_product_ids,1) IS NULL)
     AND (p_policy_ids IS NULL OR array_length(p_policy_ids,1) IS NULL) THEN
    v_scope := 'project_wide';
  ELSIF ((p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids,1) > 0)::int
       + (p_product_ids IS NOT NULL AND array_length(p_product_ids,1) > 0)::int
       + (p_policy_ids IS NOT NULL AND array_length(p_policy_ids,1) > 0)::int) > 1 THEN
    v_scope := 'mixed';
  ELSIF p_product_type_ids IS NOT NULL AND array_length(p_product_type_ids,1) > 0 THEN
    v_scope := 'product_types';
  ELSIF p_product_ids IS NOT NULL AND array_length(p_product_ids,1) > 0 THEN
    v_scope := 'specific_products';
  ELSE
    v_scope := 'sales_policies';
  END IF;
  UPDATE public.vouchers SET applicability_scope = v_scope, updated_at = now()
    WHERE id = p_voucher_id;
END $$;
REVOKE ALL ON FUNCTION public._apply_voucher_applicability(uuid,uuid,uuid[],uuid[],uuid[]) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- SECTION H: Registration counting
-- ============================================================
CREATE OR REPLACE FUNCTION public._voucher_registration_count(p_voucher_id uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.registrations
   WHERE voucher_id = p_voucher_id AND registration_type = 'voucher'
     AND status IN ('new','in_progress','confirmed','completed');
$$;
REVOKE ALL ON FUNCTION public._voucher_registration_count(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- SECTION I: CREATE VOUCHER RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_voucher(
  p_project_id uuid,
  p_voucher jsonb,
  p_product_type_ids uuid[] DEFAULT '{}'::uuid[],
  p_product_ids uuid[] DEFAULT '{}'::uuid[],
  p_policy_ids uuid[] DEFAULT '{}'::uuid[],
  p_publish boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_slug text; v_code text; v_title text; v_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_project_manager(p_project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  v_title := trim(coalesce(p_voucher->>'title',''));
  v_slug := lower(trim(coalesce(p_voucher->>'slug','')));
  v_code := NULLIF(trim(coalesce(p_voucher->>'code','')), '');
  IF v_title = '' THEN RAISE EXCEPTION 'invalid_voucher_dates' USING MESSAGE='title required'; END IF;
  IF v_slug = '' OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_slug) > 120 THEN
    RAISE EXCEPTION 'duplicate_voucher_slug' USING MESSAGE='invalid slug'; END IF;
  IF EXISTS (SELECT 1 FROM public.vouchers WHERE project_id = p_project_id AND slug = v_slug) THEN
    RAISE EXCEPTION 'duplicate_voucher_slug'; END IF;
  IF v_code IS NOT NULL AND EXISTS (SELECT 1 FROM public.vouchers
      WHERE project_id = p_project_id AND lower(code) = lower(v_code)) THEN
    RAISE EXCEPTION 'duplicate_voucher_code'; END IF;

  PERFORM public.validate_voucher_benefits(coalesce(p_voucher->'benefits_json','[]'::jsonb));
  PERFORM public.validate_voucher_conditions(coalesce(p_voucher->'conditions_json','[]'::jsonb));
  PERFORM public.validate_voucher_attachments(coalesce(p_voucher->'attachments','[]'::jsonb));
  PERFORM public.validate_voucher_dates(
    NULLIF(p_voucher->>'registration_start','')::timestamptz,
    NULLIF(p_voucher->>'registration_deadline','')::timestamptz,
    NULLIF(p_voucher->>'valid_from','')::timestamptz,
    NULLIF(p_voucher->>'valid_to','')::timestamptz);

  IF (p_voucher ? 'quantity') AND p_voucher->>'quantity' IS NOT NULL AND p_voucher->>'quantity' <> '' THEN
    IF (p_voucher->>'quantity')::int < 1 THEN RAISE EXCEPTION 'invalid_voucher_capacity'; END IF;
  END IF;
  IF (p_voucher ? 'per_user_limit') AND p_voucher->>'per_user_limit' IS NOT NULL AND p_voucher->>'per_user_limit' <> '' THEN
    IF (p_voucher->>'per_user_limit')::int < 1 THEN RAISE EXCEPTION 'invalid_voucher_capacity'; END IF;
  END IF;

  v_status := CASE WHEN p_publish THEN 'active' ELSE 'draft' END;

  INSERT INTO public.vouchers(
    project_id, title, slug, code, summary, content, voucher_type,
    value_amount, value_percent, effective_from, effective_to,
    registration_start, registration_deadline, quantity, per_user_limit,
    benefits_json, conditions_json, attachments, is_featured, priority,
    metadata, status, published_at, created_by, updated_by
  ) VALUES (
    p_project_id, v_title, v_slug, v_code, p_voucher->>'summary', p_voucher->>'content',
    COALESCE(p_voucher->>'voucher_type','other'),
    NULLIF(p_voucher->>'value_amount','')::numeric,
    NULLIF(p_voucher->>'value_percent','')::numeric,
    NULLIF(p_voucher->>'valid_from','')::timestamptz,
    NULLIF(p_voucher->>'valid_to','')::timestamptz,
    NULLIF(p_voucher->>'registration_start','')::timestamptz,
    NULLIF(p_voucher->>'registration_deadline','')::timestamptz,
    NULLIF(p_voucher->>'quantity','')::int,
    COALESCE(NULLIF(p_voucher->>'per_user_limit','')::int, 1),
    COALESCE(p_voucher->'benefits_json','[]'::jsonb),
    COALESCE(p_voucher->'conditions_json','[]'::jsonb),
    COALESCE(p_voucher->'attachments','[]'::jsonb),
    COALESCE((p_voucher->>'is_featured')::boolean, false),
    COALESCE(NULLIF(p_voucher->>'priority','')::int, 0),
    COALESCE(p_voucher->'metadata','{}'::jsonb),
    v_status,
    CASE WHEN p_publish THEN now() ELSE NULL END,
    auth.uid(), auth.uid()
  ) RETURNING id INTO v_id;

  PERFORM public._apply_voucher_applicability(v_id, p_project_id, p_product_type_ids, p_product_ids, p_policy_ids);

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'create_voucher', 'vouchers', v_id,
          jsonb_build_object('project_id', p_project_id, 'publish', p_publish,
                             'pt_count', coalesce(array_length(p_product_type_ids,1),0),
                             'p_count', coalesce(array_length(p_product_ids,1),0),
                             'pol_count', coalesce(array_length(p_policy_ids,1),0)));

  RETURN jsonb_build_object('voucher_id', v_id, 'slug', v_slug, 'code', v_code, 'status', v_status);
END $$;
REVOKE ALL ON FUNCTION public.create_voucher(uuid,jsonb,uuid[],uuid[],uuid[],boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_voucher(uuid,jsonb,uuid[],uuid[],uuid[],boolean) TO authenticated, service_role;

-- ============================================================
-- SECTION J: UPDATE VOUCHER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_voucher(
  p_voucher_id uuid,
  p_voucher_patch jsonb,
  p_product_type_ids uuid[] DEFAULT NULL,
  p_product_ids uuid[] DEFAULT NULL,
  p_policy_ids uuid[] DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_new_qty int; v_count int; v_new_slug text; v_new_code text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RAISE EXCEPTION 'voucher_archived'; END IF;

  IF p_voucher_patch ? 'project_id' THEN RAISE EXCEPTION 'permission_denied'; END IF;

  v_new_slug := COALESCE(lower(trim(p_voucher_patch->>'slug')), v.slug);
  v_new_code := CASE WHEN p_voucher_patch ? 'code'
                     THEN NULLIF(trim(p_voucher_patch->>'code'),'')
                     ELSE v.code END;
  IF v_new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(v_new_slug) > 120 THEN
    RAISE EXCEPTION 'duplicate_voucher_slug'; END IF;
  IF v_new_slug <> v.slug AND EXISTS (SELECT 1 FROM public.vouchers
      WHERE project_id = v.project_id AND slug = v_new_slug AND id <> p_voucher_id) THEN
    RAISE EXCEPTION 'duplicate_voucher_slug'; END IF;
  IF v_new_code IS NOT NULL AND lower(coalesce(v_new_code,'')) <> lower(coalesce(v.code,''))
     AND EXISTS (SELECT 1 FROM public.vouchers
       WHERE project_id = v.project_id AND lower(code) = lower(v_new_code) AND id <> p_voucher_id) THEN
    RAISE EXCEPTION 'duplicate_voucher_code'; END IF;

  IF p_voucher_patch ? 'benefits_json' THEN
    PERFORM public.validate_voucher_benefits(p_voucher_patch->'benefits_json'); END IF;
  IF p_voucher_patch ? 'conditions_json' THEN
    PERFORM public.validate_voucher_conditions(p_voucher_patch->'conditions_json'); END IF;
  IF p_voucher_patch ? 'attachments' THEN
    PERFORM public.validate_voucher_attachments(p_voucher_patch->'attachments'); END IF;

  PERFORM public.validate_voucher_dates(
    COALESCE(NULLIF(p_voucher_patch->>'registration_start','')::timestamptz, v.registration_start),
    COALESCE(NULLIF(p_voucher_patch->>'registration_deadline','')::timestamptz, v.registration_deadline),
    COALESCE(NULLIF(p_voucher_patch->>'valid_from','')::timestamptz, v.effective_from),
    COALESCE(NULLIF(p_voucher_patch->>'valid_to','')::timestamptz, v.effective_to));

  IF p_voucher_patch ? 'quantity' THEN
    v_new_qty := NULLIF(p_voucher_patch->>'quantity','')::int;
    IF v_new_qty IS NOT NULL AND v_new_qty < 1 THEN RAISE EXCEPTION 'invalid_voucher_capacity'; END IF;
    IF v_new_qty IS NOT NULL THEN
      v_count := public._voucher_registration_count(p_voucher_id);
      IF v_new_qty < v_count THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
    END IF;
  END IF;

  UPDATE public.vouchers SET
    title = COALESCE(NULLIF(p_voucher_patch->>'title',''), title),
    slug = v_new_slug,
    code = v_new_code,
    summary = CASE WHEN p_voucher_patch ? 'summary' THEN p_voucher_patch->>'summary' ELSE summary END,
    content = CASE WHEN p_voucher_patch ? 'content' THEN p_voucher_patch->>'content' ELSE content END,
    voucher_type = COALESCE(NULLIF(p_voucher_patch->>'voucher_type',''), voucher_type),
    value_amount = CASE WHEN p_voucher_patch ? 'value_amount' THEN NULLIF(p_voucher_patch->>'value_amount','')::numeric ELSE value_amount END,
    value_percent = CASE WHEN p_voucher_patch ? 'value_percent' THEN NULLIF(p_voucher_patch->>'value_percent','')::numeric ELSE value_percent END,
    effective_from = CASE WHEN p_voucher_patch ? 'valid_from' THEN NULLIF(p_voucher_patch->>'valid_from','')::timestamptz ELSE effective_from END,
    effective_to = CASE WHEN p_voucher_patch ? 'valid_to' THEN NULLIF(p_voucher_patch->>'valid_to','')::timestamptz ELSE effective_to END,
    registration_start = CASE WHEN p_voucher_patch ? 'registration_start' THEN NULLIF(p_voucher_patch->>'registration_start','')::timestamptz ELSE registration_start END,
    registration_deadline = CASE WHEN p_voucher_patch ? 'registration_deadline' THEN NULLIF(p_voucher_patch->>'registration_deadline','')::timestamptz ELSE registration_deadline END,
    quantity = CASE WHEN p_voucher_patch ? 'quantity' THEN NULLIF(p_voucher_patch->>'quantity','')::int ELSE quantity END,
    per_user_limit = CASE WHEN p_voucher_patch ? 'per_user_limit' THEN COALESCE(NULLIF(p_voucher_patch->>'per_user_limit','')::int, per_user_limit) ELSE per_user_limit END,
    benefits_json = CASE WHEN p_voucher_patch ? 'benefits_json' THEN p_voucher_patch->'benefits_json' ELSE benefits_json END,
    conditions_json = CASE WHEN p_voucher_patch ? 'conditions_json' THEN p_voucher_patch->'conditions_json' ELSE conditions_json END,
    attachments = CASE WHEN p_voucher_patch ? 'attachments' THEN p_voucher_patch->'attachments' ELSE attachments END,
    is_featured = CASE WHEN p_voucher_patch ? 'is_featured' THEN (p_voucher_patch->>'is_featured')::boolean ELSE is_featured END,
    priority = CASE WHEN p_voucher_patch ? 'priority' THEN COALESCE(NULLIF(p_voucher_patch->>'priority','')::int, priority) ELSE priority END,
    metadata = CASE WHEN p_voucher_patch ? 'metadata' THEN p_voucher_patch->'metadata' ELSE metadata END,
    updated_by = auth.uid(), updated_at = now()
  WHERE id = p_voucher_id;

  IF p_product_type_ids IS NOT NULL OR p_product_ids IS NOT NULL OR p_policy_ids IS NOT NULL THEN
    PERFORM public._apply_voucher_applicability(
      p_voucher_id, v.project_id,
      COALESCE(p_product_type_ids, ARRAY(SELECT product_type_id FROM public.voucher_product_types WHERE voucher_id = p_voucher_id)),
      COALESCE(p_product_ids, ARRAY(SELECT product_id FROM public.voucher_products WHERE voucher_id = p_voucher_id)),
      COALESCE(p_policy_ids, ARRAY(SELECT policy_id FROM public.voucher_sales_policies WHERE voucher_id = p_voucher_id)));
  END IF;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'update_voucher', 'vouchers', p_voucher_id,
          jsonb_build_object('changed_keys', (SELECT jsonb_agg(k) FROM jsonb_object_keys(p_voucher_patch) k)));
  RETURN jsonb_build_object('voucher_id', p_voucher_id, 'changed', true);
END $$;
REVOKE ALL ON FUNCTION public.update_voucher(uuid,jsonb,uuid[],uuid[],uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_voucher(uuid,jsonb,uuid[],uuid[],uuid[]) TO authenticated, service_role;

-- ============================================================
-- SECTION K: PUBLISH / PAUSE / RESUME
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_voucher(p_voucher_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; c int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.archived_at IS NOT NULL OR v.status = 'archived' THEN RAISE EXCEPTION 'voucher_archived'; END IF;
  IF v.status NOT IN ('draft','paused') THEN RAISE EXCEPTION 'voucher_not_active'; END IF;
  IF v.effective_to IS NOT NULL AND v.effective_to < now() THEN RAISE EXCEPTION 'voucher_expired'; END IF;
  IF v.registration_deadline IS NOT NULL AND v.registration_deadline < now()
     AND (v.effective_from IS NULL OR v.effective_from < now()) THEN
    RAISE EXCEPTION 'voucher_registration_closed'; END IF;
  IF v.quantity IS NOT NULL THEN
    c := public._voucher_registration_count(p_voucher_id);
    IF c > v.quantity THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
  END IF;
  UPDATE public.vouchers SET status='active',
    published_at = COALESCE(published_at, now()), updated_by = auth.uid(), updated_at = now()
    WHERE id = p_voucher_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'publish_voucher', 'vouchers', p_voucher_id);
  RETURN jsonb_build_object('voucher_id', p_voucher_id, 'status','active');
END $$;
REVOKE ALL ON FUNCTION public.publish_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_voucher(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pause_voucher(p_voucher_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'active' THEN RAISE EXCEPTION 'voucher_not_active'; END IF;
  UPDATE public.vouchers SET status='paused', updated_by = auth.uid(), updated_at = now() WHERE id = p_voucher_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'pause_voucher', 'vouchers', p_voucher_id);
  RETURN jsonb_build_object('voucher_id', p_voucher_id, 'status','paused');
END $$;
REVOKE ALL ON FUNCTION public.pause_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_voucher(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resume_voucher(p_voucher_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; c int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'paused' THEN RAISE EXCEPTION 'voucher_not_active'; END IF;
  IF v.effective_to IS NOT NULL AND v.effective_to < now() THEN RAISE EXCEPTION 'voucher_expired'; END IF;
  IF v.quantity IS NOT NULL THEN
    c := public._voucher_registration_count(p_voucher_id);
    IF c > v.quantity THEN RAISE EXCEPTION 'capacity_below_registration_count'; END IF;
  END IF;
  UPDATE public.vouchers SET status='active', updated_by = auth.uid(), updated_at = now() WHERE id = p_voucher_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id)
  VALUES (auth.uid(), 'resume_voucher', 'vouchers', p_voucher_id);
  RETURN jsonb_build_object('voucher_id', p_voucher_id, 'status','active');
END $$;
REVOKE ALL ON FUNCTION public.resume_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resume_voucher(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION L: CLONE / ARCHIVE / RESTORE
-- ============================================================
CREATE OR REPLACE FUNCTION public.clone_voucher(
  p_voucher_id uuid, p_new_slug text, p_new_code text DEFAULT NULL, p_new_title text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_new uuid; v_slug text; v_code text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  v_slug := lower(trim(coalesce(p_new_slug,'')));
  v_code := NULLIF(trim(coalesce(p_new_code,'')),'');
  IF v_slug = '' OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'duplicate_voucher_slug'; END IF;
  IF EXISTS (SELECT 1 FROM public.vouchers WHERE project_id = v.project_id AND slug = v_slug) THEN
    RAISE EXCEPTION 'duplicate_voucher_slug'; END IF;
  IF v_code IS NOT NULL AND EXISTS (SELECT 1 FROM public.vouchers
      WHERE project_id = v.project_id AND lower(code) = lower(v_code)) THEN
    RAISE EXCEPTION 'duplicate_voucher_code'; END IF;

  INSERT INTO public.vouchers(
    project_id, title, slug, code, summary, content, voucher_type,
    value_amount, value_percent, effective_from, effective_to,
    registration_start, registration_deadline, quantity, per_user_limit,
    benefits_json, conditions_json, attachments, is_featured, priority,
    metadata, status, created_by, updated_by
  ) VALUES (
    v.project_id, COALESCE(p_new_title, v.title || ' (Bản sao)'),
    v_slug, v_code, v.summary, v.content, v.voucher_type,
    v.value_amount, v.value_percent, v.effective_from, v.effective_to,
    v.registration_start, v.registration_deadline, v.quantity, v.per_user_limit,
    v.benefits_json, v.conditions_json, v.attachments, false, v.priority,
    v.metadata, 'draft', auth.uid(), auth.uid()
  ) RETURNING id INTO v_new;

  PERFORM public._apply_voucher_applicability(v_new, v.project_id,
    ARRAY(SELECT product_type_id FROM public.voucher_product_types WHERE voucher_id = p_voucher_id),
    ARRAY(SELECT product_id FROM public.voucher_products WHERE voucher_id = p_voucher_id),
    ARRAY(SELECT policy_id FROM public.voucher_sales_policies WHERE voucher_id = p_voucher_id));

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'clone_voucher', 'vouchers', v_new,
          jsonb_build_object('source_voucher_id', p_voucher_id));
  RETURN jsonb_build_object('voucher_id', v_new, 'slug', v_slug, 'code', v_code, 'status','draft');
END $$;
REVOKE ALL ON FUNCTION public.clone_voucher(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_voucher(uuid,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.archive_voucher(p_voucher_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status = 'archived' OR v.archived_at IS NOT NULL THEN RAISE EXCEPTION 'voucher_archived'; END IF;
  UPDATE public.vouchers SET status='archived', archived_at = now(),
    updated_by = auth.uid(), updated_at = now() WHERE id = p_voucher_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(),'archive_voucher','vouchers',p_voucher_id, jsonb_build_object('reason',p_reason));
  RETURN jsonb_build_object('voucher_id',p_voucher_id,'status','archived');
END $$;
REVOKE ALL ON FUNCTION public.archive_voucher(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_voucher(uuid,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.restore_voucher(p_voucher_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT public.is_project_manager(v.project_id) THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF v.status <> 'archived' AND v.archived_at IS NULL THEN RAISE EXCEPTION 'voucher_not_archived'; END IF;
  UPDATE public.vouchers SET status='draft', archived_at = NULL, published_at = NULL,
    updated_by = auth.uid(), updated_at = now() WHERE id = p_voucher_id;
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id)
  VALUES (auth.uid(),'restore_voucher','vouchers',p_voucher_id);
  RETURN jsonb_build_object('voucher_id',p_voucher_id,'status','draft');
END $$;
REVOKE ALL ON FUNCTION public.restore_voucher(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_voucher(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION M: CHECK VOUCHER ELIGIBILITY
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_voucher_eligibility(
  p_voucher_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_state text; v_count int; v_user_count int; v_remaining int;
        v_product public.products%ROWTYPE; v_effective_pt uuid;
        v_scope_match boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('eligible',false,'code','permission_denied','message','Chưa đăng nhập'); END IF;
  IF NOT public.is_active_user() THEN
    RETURN jsonb_build_object('eligible',false,'code','permission_denied','message','Tài khoản không hoạt động'); END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v IS NULL THEN RETURN jsonb_build_object('eligible',false,'code','voucher_not_found','message','Không tìm thấy'); END IF;

  v_count := public._voucher_registration_count(p_voucher_id);
  v_state := public.voucher_derived_state(p_voucher_id);
  v_remaining := CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - v_count) END;
  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE voucher_id = p_voucher_id AND registration_type='voucher'
      AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed');

  IF v_state = 'archived' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_archived','message','Đã lưu trữ','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state IN ('draft') THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_not_active','message','Chưa phát hành','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state = 'paused' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_paused','message','Đang tạm dừng','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state = 'expired' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_expired','message','Đã hết hạn','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state = 'upcoming_registration' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_registration_not_open','message','Chưa mở đăng ký','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state = 'registration_closed' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_registration_closed','message','Đã đóng đăng ký','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;
  IF v_state = 'full' THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_full','message','Đã hết số lượng','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',0,'user_registration_count',v_user_count); END IF;
  IF v_user_count >= v.per_user_limit THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_user_limit_reached','message','Đã đạt giới hạn cá nhân','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;

  -- Applicability check
  v_effective_pt := p_product_type_id;
  IF p_product_id IS NOT NULL THEN
    SELECT * INTO v_product FROM public.products WHERE id = p_product_id;
    IF v_product IS NULL OR v_product.project_id <> v.project_id THEN
      RETURN jsonb_build_object('eligible',false,'code','voucher_not_applicable','message','Sản phẩm không thuộc dự án','derived_state',v_state); END IF;
    v_effective_pt := COALESCE(v_effective_pt, v_product.product_type_id);
  END IF;

  IF v.applicability_scope = 'project_wide' THEN
    v_scope_match := true;
  ELSE
    v_scope_match :=
      (v_effective_pt IS NOT NULL AND EXISTS (SELECT 1 FROM public.voucher_product_types WHERE voucher_id = p_voucher_id AND product_type_id = v_effective_pt))
      OR (p_product_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.voucher_products WHERE voucher_id = p_voucher_id AND product_id = p_product_id))
      OR (p_policy_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.voucher_sales_policies WHERE voucher_id = p_voucher_id AND policy_id = p_policy_id));
    IF NOT v_scope_match THEN
      -- Also allow if voucher has no relations at all (safety)
      IF NOT EXISTS (SELECT 1 FROM public.voucher_product_types WHERE voucher_id = p_voucher_id)
         AND NOT EXISTS (SELECT 1 FROM public.voucher_products WHERE voucher_id = p_voucher_id)
         AND NOT EXISTS (SELECT 1 FROM public.voucher_sales_policies WHERE voucher_id = p_voucher_id) THEN
        v_scope_match := true; END IF;
    END IF;
  END IF;
  IF NOT v_scope_match THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_not_applicable','message','Không thuộc phạm vi áp dụng','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;

  -- Profile completeness
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()
      AND COALESCE(full_name,'') <> '' AND COALESCE(phone,'') <> '') THEN
    RETURN jsonb_build_object('eligible',false,'code','voucher_profile_incomplete','message','Cần cập nhật họ tên & số điện thoại','derived_state',v_state,
      'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count); END IF;

  RETURN jsonb_build_object('eligible',true,'code','ok','message','Đủ điều kiện','derived_state',v_state,
    'capacity',v.quantity,'registration_count',v_count,'remaining',v_remaining,'user_registration_count',v_user_count);
END $$;
REVOKE ALL ON FUNCTION public.check_voucher_eligibility(uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_voucher_eligibility(uuid,uuid,uuid,uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION N: REGISTER FOR VOUCHER
-- ============================================================
CREATE OR REPLACE FUNCTION public.register_for_voucher(
  p_voucher_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_prof public.profiles%ROWTYPE; v_lead_id uuid;
        v_reg_id uuid; v_reg_code text; v_count int; v_user_count int;
        v_elig jsonb; v_source_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  -- Advisory lock on voucher
  PERFORM pg_advisory_xact_lock(hashtextextended(p_voucher_id::text, 42));

  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;

  v_elig := public.check_voucher_eligibility(p_voucher_id, p_product_id, p_product_type_id, p_policy_id);
  IF NOT (v_elig->>'eligible')::boolean THEN
    RAISE EXCEPTION '%', v_elig->>'code'; END IF;

  -- Re-check capacity under lock
  v_count := public._voucher_registration_count(p_voucher_id);
  IF v.quantity IS NOT NULL AND v_count >= v.quantity THEN RAISE EXCEPTION 'voucher_full'; END IF;
  SELECT count(*) INTO v_user_count FROM public.registrations
    WHERE voucher_id = p_voucher_id AND registration_type='voucher'
      AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed');
  IF v_user_count >= v.per_user_limit THEN RAISE EXCEPTION 'voucher_user_limit_reached'; END IF;
  IF EXISTS (SELECT 1 FROM public.registrations WHERE voucher_id = p_voucher_id
      AND registration_type='voucher' AND created_by = auth.uid() AND status IN ('new','in_progress','confirmed','completed')
      AND v.per_user_limit = 1) THEN
    RAISE EXCEPTION 'duplicate_voucher_registration'; END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = auth.uid();
  IF v_prof IS NULL OR COALESCE(v_prof.full_name,'') = '' OR COALESCE(v_prof.phone,'') = '' THEN
    RAISE EXCEPTION 'voucher_profile_incomplete'; END IF;

  -- Lead reuse or create
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

  INSERT INTO public.registrations(registration_type, lead_id, project_id, product_id,
                                    voucher_id, created_by, status, note, metadata)
  VALUES ('voucher', v_lead_id, v.project_id, p_product_id, p_voucher_id, auth.uid(), 'new',
          p_note, jsonb_build_object('product_type_id', p_product_type_id, 'policy_id', p_policy_id))
  RETURNING id, registration_code INTO v_reg_id, v_reg_code;

  -- Update cached count best-effort
  UPDATE public.vouchers SET registered_count = v_count + 1, updated_at = now() WHERE id = p_voucher_id;

  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(),'register_for_voucher','registrations',v_reg_id,
          jsonb_build_object('voucher_id',p_voucher_id,'lead_id',v_lead_id));

  RETURN jsonb_build_object('registration_id',v_reg_id,'registration_code',v_reg_code,
    'status','new','voucher_id',p_voucher_id,
    'remaining', CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - (v_count+1)) END);
END $$;
REVOKE ALL ON FUNCTION public.register_for_voucher(uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_voucher(uuid,uuid,uuid,uuid,text) TO authenticated, service_role;

-- ============================================================
-- SECTION O: CANCEL MY VOUCHER REGISTRATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_my_voucher_registration(p_registration_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.registrations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.registrations WHERE id = p_registration_id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'not_found' USING ERRCODE='P0002'; END IF;
  IF r.created_by <> auth.uid() THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF r.registration_type <> 'voucher' THEN RAISE EXCEPTION 'registration_not_cancellable'; END IF;
  IF r.status NOT IN ('new','in_progress') THEN RAISE EXCEPTION 'registration_not_cancellable'; END IF;
  UPDATE public.registrations SET status='cancelled', updated_at = now() WHERE id = p_registration_id;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id)
  VALUES (auth.uid(),'cancel_voucher_registration','registrations',p_registration_id);
  RETURN jsonb_build_object('registration_id',p_registration_id,'status','cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_my_voucher_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_voucher_registration(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION P: ADMIN DETAIL & SEARCH
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_voucher_admin_detail(p_voucher_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_count int; v_state text; v_pending int; v_confirmed int; v_cancelled int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF NOT (public.is_project_manager(v.project_id) OR public.is_project_member(v.project_id)
          OR public.has_any_role(ARRAY['super_admin','admin','director'])) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;

  v_count := public._voucher_registration_count(p_voucher_id);
  v_state := public.voucher_derived_state(p_voucher_id);
  SELECT count(*) FILTER (WHERE status IN ('new','in_progress')),
         count(*) FILTER (WHERE status IN ('confirmed','completed')),
         count(*) FILTER (WHERE status IN ('cancelled','no_show'))
    INTO v_pending, v_confirmed, v_cancelled
    FROM public.registrations WHERE voucher_id = p_voucher_id AND registration_type='voucher';

  RETURN jsonb_build_object(
    'voucher', to_jsonb(v),
    'derived_state', v_state,
    'project', (SELECT to_jsonb(p) FROM public.projects p WHERE p.id = v.project_id),
    'product_types', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pt.id,'name',pt.name,'code',pt.code) ORDER BY pt.name)
      FROM public.voucher_product_types vpt JOIN public.product_types pt ON pt.id = vpt.product_type_id
      WHERE vpt.voucher_id = p_voucher_id), '[]'::jsonb),
    'products', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.id,'product_code',p.product_code,'product_name',p.product_name) ORDER BY p.product_code)
      FROM public.voucher_products vp JOIN public.products p ON p.id = vp.product_id
      WHERE vp.voucher_id = p_voucher_id), '[]'::jsonb),
    'policies', COALESCE((SELECT jsonb_agg(jsonb_build_object('id',sp.id,'title',sp.title,'slug',sp.slug) ORDER BY sp.title)
      FROM public.voucher_sales_policies vsp JOIN public.sales_policies sp ON sp.id = vsp.policy_id
      WHERE vsp.voucher_id = p_voucher_id), '[]'::jsonb),
    'capacity_stats', jsonb_build_object('capacity',v.quantity,'registration_count',v_count,
      'remaining', CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - v_count) END),
    'registration_stats', jsonb_build_object('pending',v_pending,'confirmed',v_confirmed,'cancelled',v_cancelled),
    'permissions', jsonb_build_object('can_manage', public.is_project_manager(v.project_id))
  );
END $$;
REVOKE ALL ON FUNCTION public.get_voucher_admin_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_voucher_admin_detail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_vouchers(
  p_project_id uuid, p_query text DEFAULT NULL, p_status text DEFAULT NULL,
  p_derived_state text DEFAULT NULL, p_featured boolean DEFAULT NULL,
  p_include_archived boolean DEFAULT false,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb; v_total int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_project_manager(p_project_id) OR public.is_project_member(p_project_id)
          OR public.has_any_role(ARRAY['super_admin','admin','director'])) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;
  IF p_offset < 0 THEN p_offset := 0; END IF;

  WITH filtered AS (
    SELECT v.*, public._voucher_registration_count(v.id) AS reg_count,
           public.voucher_derived_state(v.id) AS derived_state,
           (SELECT count(*) FROM public.voucher_product_types WHERE voucher_id = v.id) AS pt_count,
           (SELECT count(*) FROM public.voucher_products WHERE voucher_id = v.id) AS p_count,
           (SELECT count(*) FROM public.voucher_sales_policies WHERE voucher_id = v.id) AS pol_count
    FROM public.vouchers v
    WHERE v.project_id = p_project_id
      AND (p_include_archived OR (v.archived_at IS NULL AND v.status <> 'archived'))
      AND (p_status IS NULL OR v.status = p_status)
      AND (p_featured IS NULL OR v.is_featured = p_featured)
      AND (p_query IS NULL OR p_query = ''
           OR v.title ILIKE '%'||p_query||'%'
           OR v.slug ILIKE '%'||p_query||'%'
           OR COALESCE(v.code,'') ILIKE '%'||p_query||'%'
           OR COALESCE(v.summary,'') ILIKE '%'||p_query||'%')
  ), stated AS (
    SELECT * FROM filtered WHERE p_derived_state IS NULL OR derived_state = p_derived_state
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'slug',slug,'code',code,'status',status,'derived_state',derived_state,
    'registration_start',registration_start,'registration_deadline',registration_deadline,
    'valid_from',effective_from,'valid_to',effective_to,
    'capacity',quantity,'registration_count',reg_count,
    'remaining', CASE WHEN quantity IS NULL THEN NULL ELSE greatest(0, quantity - reg_count) END,
    'pt_count',pt_count,'p_count',p_count,'pol_count',pol_count,
    'applicability_scope',applicability_scope,
    'is_featured',is_featured,'priority',priority,'updated_at',updated_at
  ) ORDER BY priority DESC, updated_at DESC, id), '[]'::jsonb), count(*)
    INTO v_rows, v_total
    FROM (SELECT * FROM stated ORDER BY priority DESC, updated_at DESC, id
          LIMIT p_limit OFFSET p_offset) x;

  SELECT count(*) INTO v_total FROM stated;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $$;
REVOKE ALL ON FUNCTION public.search_vouchers(uuid,text,text,text,boolean,boolean,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_vouchers(uuid,text,text,text,boolean,boolean,int,int) TO authenticated, service_role;

-- ============================================================
-- SECTION Q: MOBILE ACTIVE VOUCHERS QUERY
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_active_project_vouchers(
  p_project_id uuid,
  p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL,
  p_policy_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;

  WITH vs AS (
    SELECT v.*, public._voucher_registration_count(v.id) AS reg_count,
           public.voucher_derived_state(v.id) AS derived_state
    FROM public.vouchers v
    WHERE v.project_id = p_project_id
      AND v.archived_at IS NULL
      AND v.status = 'active'
      AND v.published_at IS NOT NULL
  ), applied AS (
    SELECT vs.* FROM vs
    WHERE vs.applicability_scope = 'project_wide'
       OR (p_product_type_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.voucher_product_types x WHERE x.voucher_id = vs.id AND x.product_type_id = p_product_type_id))
       OR (p_product_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.voucher_products x WHERE x.voucher_id = vs.id AND x.product_id = p_product_id))
       OR (p_policy_id IS NOT NULL AND EXISTS
             (SELECT 1 FROM public.voucher_sales_policies x WHERE x.voucher_id = vs.id AND x.policy_id = p_policy_id))
       OR (p_product_id IS NULL AND p_product_type_id IS NULL AND p_policy_id IS NULL)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'title',title,'slug',slug,'code',code,'summary',summary,
    'benefits', benefits_json,
    'registration_deadline',registration_deadline,
    'valid_to',effective_to,'is_featured',is_featured,'priority',priority,
    'derived_state',derived_state,'capacity',quantity,'registration_count',reg_count,
    'remaining', CASE WHEN quantity IS NULL THEN NULL ELSE greatest(0, quantity - reg_count) END,
    'user_registration_count', (SELECT count(*) FROM public.registrations r
       WHERE r.voucher_id = applied.id AND r.registration_type='voucher'
         AND r.created_by = auth.uid() AND r.status IN ('new','in_progress','confirmed','completed'))
  ) ORDER BY priority DESC, updated_at DESC, id), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM applied ORDER BY priority DESC, updated_at DESC, id LIMIT p_limit OFFSET p_offset) applied;

  RETURN jsonb_build_object('rows', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.get_active_project_vouchers(uuid,uuid,uuid,uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_project_vouchers(uuid,uuid,uuid,uuid,int,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_voucher_detail(
  p_voucher_id uuid, p_product_id uuid DEFAULT NULL,
  p_product_type_id uuid DEFAULT NULL, p_policy_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vouchers%ROWTYPE; v_count int; v_elig jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.vouchers WHERE id = p_voucher_id;
  IF v IS NULL THEN RAISE EXCEPTION 'voucher_not_found' USING ERRCODE='P0002'; END IF;
  IF v.archived_at IS NOT NULL OR v.status IN ('archived','draft') THEN
    RAISE EXCEPTION 'voucher_not_active'; END IF;

  v_count := public._voucher_registration_count(p_voucher_id);
  v_elig := public.check_voucher_eligibility(p_voucher_id, p_product_id, p_product_type_id, p_policy_id);

  RETURN jsonb_build_object(
    'voucher', jsonb_build_object(
      'id',v.id,'title',v.title,'slug',v.slug,'code',v.code,'summary',v.summary,
      'benefits',v.benefits_json,'conditions',v.conditions_json,'attachments',v.attachments,
      'registration_start',v.registration_start,'registration_deadline',v.registration_deadline,
      'valid_from',v.effective_from,'valid_to',v.effective_to,
      'capacity',v.quantity,'per_user_limit',v.per_user_limit,'is_featured',v.is_featured,
      'applicability_scope',v.applicability_scope),
    'derived_state', public.voucher_derived_state(p_voucher_id),
    'capacity_stats', jsonb_build_object('capacity',v.quantity,'registration_count',v_count,
      'remaining', CASE WHEN v.quantity IS NULL THEN NULL ELSE greatest(0, v.quantity - v_count) END),
    'eligibility', v_elig,
    'my_registrations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',r.id,'registration_code',r.registration_code,'status',r.status,'created_at',r.created_at))
      FROM public.registrations r WHERE r.voucher_id = p_voucher_id
        AND r.created_by = auth.uid()), '[]'::jsonb),
    'project', (SELECT jsonb_build_object('id',p.id,'name',p.name,'code',p.code) FROM public.projects p WHERE p.id = v.project_id)
  );
END $$;
REVOKE ALL ON FUNCTION public.get_active_voucher_detail(uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_voucher_detail(uuid,uuid,uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_voucher_registrations(
  p_project_id uuid DEFAULT NULL, p_status text DEFAULT NULL,
  p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
  IF p_limit > 100 THEN p_limit := 100; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id, 'registration_code', r.registration_code, 'status', r.status,
    'created_at', r.created_at,
    'voucher', jsonb_build_object('id',v.id,'title',v.title,'code',v.code),
    'project', jsonb_build_object('id',p.id,'name',p.name,'code',p.code),
    'product', CASE WHEN pr.id IS NULL THEN NULL
                    ELSE jsonb_build_object('id',pr.id,'product_code',pr.product_code,'product_name',pr.product_name) END,
    'can_cancel', r.status IN ('new','in_progress')
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM public.registrations
        WHERE registration_type='voucher' AND created_by = auth.uid()
          AND (p_project_id IS NULL OR project_id = p_project_id)
          AND (p_status IS NULL OR status = p_status)
        ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset) r
  LEFT JOIN public.vouchers v ON v.id = r.voucher_id
  LEFT JOIN public.projects p ON p.id = r.project_id
  LEFT JOIN public.products pr ON pr.id = r.product_id;

  RETURN jsonb_build_object('rows', v_rows);
END $$;
REVOKE ALL ON FUNCTION public.get_my_voucher_registrations(uuid,text,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_voucher_registrations(uuid,text,int,int) TO authenticated, service_role;
