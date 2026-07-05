
-- SALES_POLICIES
CREATE TABLE public.sales_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL, slug text NOT NULL, summary text, content text,
  effective_from timestamptz, effective_to timestamptz,
  registration_deadline timestamptz,
  attachment_url text, version text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived')),
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);
CREATE INDEX sales_policies_project_idx ON public.sales_policies(project_id);
CREATE INDEX sales_policies_status_idx ON public.sales_policies(status) WHERE archived_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_policies TO authenticated;
GRANT ALL ON public.sales_policies TO service_role;
ALTER TABLE public.sales_policies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sales_policies_updated_at BEFORE UPDATE ON public.sales_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.policy_product_types (
  policy_id uuid NOT NULL REFERENCES public.sales_policies(id) ON DELETE CASCADE,
  product_type_id uuid NOT NULL REFERENCES public.product_types(id) ON DELETE CASCADE,
  PRIMARY KEY (policy_id, product_type_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_product_types TO authenticated;
GRANT ALL ON public.policy_product_types TO service_role;
ALTER TABLE public.policy_product_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.policy_products (
  policy_id uuid NOT NULL REFERENCES public.sales_policies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (policy_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policy_products TO authenticated;
GRANT ALL ON public.policy_products TO service_role;
ALTER TABLE public.policy_products ENABLE ROW LEVEL SECURITY;

-- VOUCHERS
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL, slug text NOT NULL, summary text, content text,
  voucher_type text NOT NULL DEFAULT 'amount' CHECK (voucher_type IN ('amount','percent','gift','other')),
  value_amount numeric, value_percent numeric,
  effective_from timestamptz, effective_to timestamptz,
  registration_deadline timestamptz,
  quantity integer, registered_count integer NOT NULL DEFAULT 0,
  attachment_url text, thumbnail_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived')),
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);
CREATE INDEX vouchers_project_idx ON public.vouchers(project_id);
CREATE INDEX vouchers_status_idx ON public.vouchers(status) WHERE archived_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vouchers_updated_at BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL, slug text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('event','site_tour','training','launch','other')),
  summary text, content text,
  location_name text, address_text text,
  start_at timestamptz, end_at timestamptz,
  registration_deadline timestamptz,
  capacity integer, registered_count integer NOT NULL DEFAULT 0,
  thumbnail_url text, attachment_url text, contact_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived','completed','cancelled')),
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_project_idx ON public.events(project_id);
CREATE INDEX events_start_idx ON public.events(start_at);
CREATE INDEX events_status_idx ON public.events(status) WHERE archived_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- LEAD_SOURCES
CREATE TABLE public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_sources TO authenticated;
GRANT ALL ON public.lead_sources TO service_role;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- LEADS
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  normalized_phone text,
  email text,
  source_id uuid REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  interested_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  interested_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost','archived')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_normalized_phone_idx ON public.leads(normalized_phone);
CREATE INDEX leads_assigned_idx ON public.leads(assigned_to);
CREATE INDEX leads_project_idx ON public.leads(interested_project_id);
CREATE INDEX leads_status_idx ON public.leads(status);
CREATE INDEX leads_priority_idx ON public.leads(priority);
CREATE INDEX leads_created_at_idx ON public.leads(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.leads_set_normalized_phone()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.normalized_phone := public.normalize_phone(NEW.phone);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_leads_normalize_phone BEFORE INSERT OR UPDATE OF phone ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_set_normalized_phone();

-- REGISTRATIONS
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_code text NOT NULL UNIQUE,
  registration_type text NOT NULL CHECK (registration_type IN ('consultation','voucher','site_tour','event')),
  lead_id uuid REFERENCES public.leads(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','confirmed','completed','cancelled','no_show')),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registrations_type_targets CHECK (
    (registration_type <> 'voucher' OR voucher_id IS NOT NULL)
    AND (registration_type NOT IN ('site_tour','event') OR event_id IS NOT NULL)
  )
);
CREATE INDEX registrations_type_idx ON public.registrations(registration_type);
CREATE INDEX registrations_status_idx ON public.registrations(status);
CREATE INDEX registrations_lead_idx ON public.registrations(lead_id);
CREATE INDEX registrations_assigned_idx ON public.registrations(assigned_to);
CREATE INDEX registrations_project_idx ON public.registrations(project_id);
CREATE INDEX registrations_created_by_idx ON public.registrations(created_by);
GRANT SELECT, INSERT, UPDATE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_registrations_updated_at BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registration code generator: MMG-YYYYMMDD-XXXXXX (collision-safe up to 5 retries)
CREATE OR REPLACE FUNCTION public.generate_registration_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  IF NEW.registration_code IS NOT NULL AND length(NEW.registration_code) > 0 THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := 'MMG-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(encode(gen_random_bytes(4),'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.registrations WHERE registration_code = candidate);
    attempts := attempts + 1;
    IF attempts > 5 THEN
      candidate := 'MMG-' || to_char(now(), 'YYYYMMDD') || '-' ||
        upper(substr(encode(gen_random_bytes(8),'hex'), 1, 10));
      EXIT;
    END IF;
  END LOOP;
  NEW.registration_code := candidate;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_registrations_generate_code BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.generate_registration_code();

-- FAVORITES
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX favorites_product_idx ON public.favorites(product_id);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text,
  entity_type text,
  entity_id uuid,
  action_url text,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON public.notifications(user_id);
CREATE INDEX notifications_read_idx ON public.notifications(read_at);
CREATE INDEX notifications_created_idx ON public.notifications(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- INVENTORY IMPORT
CREATE TABLE public.inventory_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  file_name text NOT NULL,
  file_url text,
  import_type text NOT NULL CHECK (import_type IN ('full_snapshot','incremental','price_update','status_update')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  total_rows integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at timestamptz,
  completed_at timestamptz,
  error_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX iij_project_idx ON public.inventory_import_jobs(project_id);
CREATE INDEX iij_status_idx ON public.inventory_import_jobs(status);
GRANT SELECT, INSERT, UPDATE ON public.inventory_import_jobs TO authenticated;
GRANT ALL ON public.inventory_import_jobs TO service_role;
ALTER TABLE public.inventory_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_iij_updated_at BEFORE UPDATE ON public.inventory_import_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.inventory_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.inventory_import_jobs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_code text,
  action text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','skipped')),
  error_message text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(import_job_id, row_number)
);
CREATE INDEX iir_job_idx ON public.inventory_import_rows(import_job_id);
CREATE INDEX iir_status_idx ON public.inventory_import_rows(status);
CREATE INDEX iir_product_code_idx ON public.inventory_import_rows(product_code);
GRANT SELECT, INSERT, UPDATE ON public.inventory_import_rows TO authenticated;
GRANT ALL ON public.inventory_import_rows TO service_role;
ALTER TABLE public.inventory_import_rows ENABLE ROW LEVEL SECURITY;

-- AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_user_idx ON public.audit_logs(user_id);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_old jsonb DEFAULT NULL, p_new jsonb DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data, metadata)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_old, p_new, p_metadata)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
