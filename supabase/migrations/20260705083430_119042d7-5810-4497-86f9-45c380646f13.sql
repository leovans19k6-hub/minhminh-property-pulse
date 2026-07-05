
-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  zone_id uuid REFERENCES public.project_zones(id) ON DELETE RESTRICT,
  building_id uuid REFERENCES public.buildings(id) ON DELETE RESTRICT,
  floor_id uuid REFERENCES public.floors(id) ON DELETE RESTRICT,
  product_type_id uuid REFERENCES public.product_types(id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  product_name text,
  category text NOT NULL CHECK (category IN ('low_rise','apartment','commercial','other')),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','holding','booked','sold','locked','unavailable')),
  inventory_source text,
  external_code text,
  -- low-rise
  land_area numeric,
  construction_area numeric,
  total_floor_area numeric,
  frontage numeric,
  depth numeric,
  number_of_floors numeric,
  direction text,
  construction_status text,
  -- apartment
  carpet_area numeric,
  built_up_area numeric,
  floor_number integer,
  unit_type text,
  door_direction text,
  balcony_direction text,
  view_text text,
  bedrooms numeric,
  bathrooms numeric,
  -- common
  handover_standard text,
  ownership_type text,
  legal_status text,
  release_date timestamptz,
  featured boolean NOT NULL DEFAULT false,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, product_code)
);
CREATE INDEX products_project_idx ON public.products(project_id);
CREATE INDEX products_zone_idx ON public.products(zone_id);
CREATE INDEX products_building_idx ON public.products(building_id);
CREATE INDEX products_floor_idx ON public.products(floor_id);
CREATE INDEX products_product_type_idx ON public.products(product_type_id);
CREATE INDEX products_category_idx ON public.products(category);
CREATE INDEX products_status_idx ON public.products(status);
CREATE INDEX products_code_lower_idx ON public.products (lower(product_code));
CREATE INDEX products_direction_idx ON public.products(direction);
CREATE INDEX products_door_direction_idx ON public.products(door_direction);
CREATE INDEX products_balcony_direction_idx ON public.products(balcony_direction);
CREATE INDEX products_floor_number_idx ON public.products(floor_number);
CREATE INDEX products_land_area_idx ON public.products(land_area);
CREATE INDEX products_construction_area_idx ON public.products(construction_area);
CREATE INDEX products_carpet_area_idx ON public.products(carpet_area);
CREATE INDEX products_built_up_area_idx ON public.products(built_up_area);
CREATE INDEX products_featured_idx ON public.products(featured);
CREATE INDEX products_updated_at_idx ON public.products(updated_at DESC);
CREATE INDEX products_project_status_idx ON public.products(project_id, status);
CREATE INDEX products_project_cat_status_idx ON public.products(project_id, category, status);
CREATE INDEX products_project_zone_status_idx ON public.products(project_id, zone_id, status);
CREATE INDEX products_project_building_floor_status_idx ON public.products(project_id, building_id, floor_number, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT_MEDIA
CREATE TABLE public.product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','floor_plan','video','virtual_tour','document','other')),
  file_url text NOT NULL,
  thumbnail_url text,
  title text, alt_text text,
  display_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_media_product_idx ON public.product_media(product_id);
CREATE UNIQUE INDEX product_media_primary_key ON public.product_media(product_id) WHERE is_primary = true;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_product_media_updated_at BEFORE UPDATE ON public.product_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT_PRICE_OPTIONS
CREATE TABLE public.product_price_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_code text NOT NULL,
  price_name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'VND',
  price_per_sqm numeric,
  discount_amount numeric,
  discount_percent numeric,
  loan_ratio numeric,
  grace_period_months integer,
  payment_term_summary text,
  is_primary boolean NOT NULL DEFAULT false,
  effective_from timestamptz,
  effective_to timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, price_code)
);
CREATE INDEX ppo_product_idx ON public.product_price_options(product_id);
CREATE INDEX ppo_amount_idx ON public.product_price_options(amount);
CREATE INDEX ppo_status_idx ON public.product_price_options(status);
CREATE INDEX ppo_effective_from_idx ON public.product_price_options(effective_from);
CREATE INDEX ppo_effective_to_idx ON public.product_price_options(effective_to);
CREATE UNIQUE INDEX ppo_primary_active_key ON public.product_price_options(product_id)
  WHERE is_primary = true AND status = 'active';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_price_options TO authenticated;
GRANT ALL ON public.product_price_options TO service_role;
ALTER TABLE public.product_price_options ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ppo_updated_at BEFORE UPDATE ON public.product_price_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT_PRICE_HISTORY (append-only)
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  price_option_id uuid REFERENCES public.product_price_options(id) ON DELETE SET NULL,
  price_code text,
  old_amount numeric,
  new_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'VND',
  reason text, source text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX pph_product_idx ON public.product_price_history(product_id, changed_at DESC);
GRANT SELECT, INSERT ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

-- PRODUCT_STATUS_HISTORY (append-only, trigger-populated)
CREATE TABLE public.product_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  old_status text,
  new_status text NOT NULL,
  reason text, source text,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX psh_product_idx ON public.product_status_history(product_id, changed_at DESC);
GRANT SELECT, INSERT ON public.product_status_history TO authenticated;
GRANT ALL ON public.product_status_history TO service_role;
ALTER TABLE public.product_status_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_product_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.product_status_history (product_id, old_status, new_status, source, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'trigger', auth.uid());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_products_status_history AFTER UPDATE OF status ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_status_change();

-- PROJECT_DOCUMENTS
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  title text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('sales_kit','price_list','floor_plan','legal','policy','brochure','training','media','other')),
  description text,
  file_url text NOT NULL,
  thumbnail_url text,
  version text,
  effective_date timestamptz,
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft','archived')),
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_documents_project_idx ON public.project_documents(project_id);
CREATE INDEX project_documents_type_idx ON public.project_documents(document_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_project_documents_updated_at BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
