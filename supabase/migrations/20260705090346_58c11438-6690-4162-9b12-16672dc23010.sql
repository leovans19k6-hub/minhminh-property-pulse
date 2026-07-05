
-- ============ 1. REGISTRATION CODE DEFAULT ============
CREATE OR REPLACE FUNCTION public.generate_registration_code_value()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  LOOP
    candidate := 'MMG-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(encode(gen_random_bytes(4),'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.registrations WHERE registration_code = candidate);
    attempts := attempts + 1;
    IF attempts > 8 THEN
      candidate := 'MMG-' || to_char(now(), 'YYYYMMDD') || '-' ||
        upper(substr(encode(gen_random_bytes(8),'hex'), 1, 10));
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END; $$;

ALTER TABLE public.registrations
  ALTER COLUMN registration_code SET DEFAULT public.generate_registration_code_value();

-- Update the existing trigger to only fill when missing (do not overwrite valid input)
CREATE OR REPLACE FUNCTION public.generate_registration_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.registration_code IS NULL OR length(NEW.registration_code) = 0 THEN
    NEW.registration_code := public.generate_registration_code_value();
  END IF;
  RETURN NEW;
END; $$;

-- ============ 2. AUDIT LOG HARDENING ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='audit_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', p.policyname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_any_role(ARRAY['super_admin','admin','director']));

REVOKE EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text, text, uuid, jsonb, jsonb, jsonb)
  TO service_role;

-- ============ 3. PROJECT ROLE HELPERS ============
CREATE OR REPLACE FUNCTION public.has_project_role(p_project_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
      AND pm.member_role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_any_role(ARRAY['super_admin','admin','director'])
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = p_project_id
        AND pm.user_id = auth.uid()
        AND pm.member_role = ANY(ARRAY['project_director','sales_director','sales_manager','marketing_lead','admin'])
    );
$$;

-- ============ 4. ACTIVE USER HELPER ============
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND COALESCE(status, 'active') = 'active'
  );
$$;

-- ============ 5. PROFILE AUTO-PROVISION (no default privileged role) ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ 6. BOOTSTRAP SUPER ADMIN ============
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User % not found in auth.users', p_user_id;
  END IF;

  INSERT INTO public.profiles (id, full_name, status)
  SELECT p_user_id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), 'active'
  FROM auth.users u WHERE u.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET status = 'active';

  SELECT id INTO v_role_id FROM public.roles WHERE code = 'super_admin';
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'super_admin role not found in public.roles';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role_id = v_role_id) THEN
    RAISE EXCEPTION 'A super_admin already exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (p_user_id, v_role_id);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  VALUES (p_user_id, 'bootstrap_super_admin', 'user_roles', p_user_id,
          jsonb_build_object('role', 'super_admin'));
END; $$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin(uuid) TO service_role;
