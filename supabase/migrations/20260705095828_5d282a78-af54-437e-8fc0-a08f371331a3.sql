-- Allow active users to read profiles of members of projects they belong to.
-- This is required so project-scoped project_director users can render
-- the project members list and see teammate names/positions/phones.
-- It does NOT open profiles to the whole authenticated pool.

CREATE POLICY "profiles_select_project_teammates"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_active_user() AND EXISTS (
    SELECT 1
    FROM public.project_members me
    JOIN public.project_members other ON other.project_id = me.project_id
    WHERE me.user_id = auth.uid()
      AND other.user_id = profiles.id
  )
);