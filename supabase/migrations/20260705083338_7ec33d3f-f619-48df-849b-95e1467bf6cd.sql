
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN phone IS NULL THEN NULL ELSE regexp_replace(phone, '[^0-9+]', '', 'g') END;
$$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text, phone text, avatar_url text,
  branch text, department text, position text, employee_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_employee_code_key ON public.profiles(employee_code) WHERE employee_code IS NOT NULL;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ROLES + USER_ROLES
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);
CREATE INDEX user_roles_user_idx ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(role_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.code = role_code);
$$;
CREATE OR REPLACE FUNCTION public.has_any_role(role_codes text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.code = ANY(role_codes));
$$;

-- DEVELOPERS
CREATE TABLE public.developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE,
  logo_url text, website_url text, description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.developers TO authenticated;
GRANT ALL ON public.developers TO service_role;
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_developers_updated_at BEFORE UPDATE ON public.developers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROJECTS
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid REFERENCES public.developers(id) ON DELETE RESTRICT,
  name text NOT NULL, slug text NOT NULL UNIQUE, code text NOT NULL UNIQUE,
  location_text text, province text, district text,
  description text, short_description text,
  thumbnail_url text, cover_url text, logo_url text,
  project_category text NOT NULL DEFAULT 'mixed' CHECK (project_category IN ('low_rise','apartment','mixed','commercial','other')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','coming_soon','handover','closed','draft')),
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_status_idx ON public.projects(status) WHERE archived_at IS NULL;
CREATE INDEX projects_category_idx ON public.projects(project_category);
CREATE INDEX projects_developer_idx ON public.projects(developer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROJECT_ZONES
CREATE TABLE public.project_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  parent_zone_id uuid REFERENCES public.project_zones(id) ON DELETE RESTRICT,
  name text NOT NULL, code text NOT NULL, zone_type text, description text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, code)
);
CREATE INDEX project_zones_project_idx ON public.project_zones(project_id);
CREATE INDEX project_zones_parent_idx ON public.project_zones(parent_zone_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_zones TO authenticated;
GRANT ALL ON public.project_zones TO service_role;
ALTER TABLE public.project_zones ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_project_zones_updated_at BEFORE UPDATE ON public.project_zones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- BUILDINGS
CREATE TABLE public.buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  zone_id uuid REFERENCES public.project_zones(id) ON DELETE RESTRICT,
  name text NOT NULL, code text NOT NULL, building_type text,
  total_floors integer, basement_floors integer, description text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, code)
);
CREATE INDEX buildings_project_idx ON public.buildings(project_id);
CREATE INDEX buildings_zone_idx ON public.buildings(zone_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_buildings_updated_at BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FLOORS
CREATE TABLE public.floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE RESTRICT,
  floor_number integer, floor_code text NOT NULL, floor_name text,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(building_id, floor_code)
);
CREATE INDEX floors_building_idx ON public.floors(building_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floors TO authenticated;
GRANT ALL ON public.floors TO service_role;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_floors_updated_at BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT_TYPES
CREATE TABLE public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE RESTRICT,
  code text NOT NULL, name text NOT NULL,
  category text NOT NULL CHECK (category IN ('low_rise','apartment','commercial','other')),
  description text,
  display_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_types_global_code_key ON public.product_types(code) WHERE project_id IS NULL;
CREATE UNIQUE INDEX product_types_project_code_key ON public.product_types(project_id, code) WHERE project_id IS NOT NULL;
CREATE INDEX product_types_category_idx ON public.product_types(category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_types TO authenticated;
GRANT ALL ON public.product_types TO service_role;
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_product_types_updated_at BEFORE UPDATE ON public.product_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROJECT_MEMBERS
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role text NOT NULL CHECK (member_role IN ('project_director','sales_manager','sales','marketing','marketing_lead','admin','support')),
  is_primary_contact boolean NOT NULL DEFAULT false,
  phone_override text, zalo_url text, note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, member_role)
);
CREATE INDEX project_members_project_idx ON public.project_members(project_id);
CREATE INDEX project_members_user_idx ON public.project_members(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_project_members_updated_at BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Project-membership helper functions (created AFTER project_members exists)
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_project_manager(p_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid()
      AND pm.member_role IN ('project_director','sales_manager','marketing_lead','admin'));
$$;
