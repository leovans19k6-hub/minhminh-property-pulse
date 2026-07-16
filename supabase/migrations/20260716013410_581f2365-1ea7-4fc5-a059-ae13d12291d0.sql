
-- Tighten leads_read: remove broad project_manager access; keep owners + admin/director
DROP POLICY IF EXISTS leads_read ON public.leads;
CREATE POLICY leads_read ON public.leads
FOR SELECT TO authenticated
USING (
  is_active_user() AND (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR has_any_role(ARRAY['super_admin'::text, 'admin'::text, 'director'::text])
  )
);

-- Tighten profiles teammate visibility: only project managers of a shared project,
-- not every teammate, can see other members' profile contact fields.
DROP POLICY IF EXISTS profiles_select_project_teammates ON public.profiles;
CREATE POLICY profiles_select_project_teammates ON public.profiles
FOR SELECT TO authenticated
USING (
  is_active_user() AND EXISTS (
    SELECT 1
    FROM public.project_members other
    WHERE other.user_id = profiles.id
      AND is_project_manager(other.project_id)
  )
);
