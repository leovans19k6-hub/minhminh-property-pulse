
ALTER VIEW public.inventory_product_summary SET (security_invoker = true);
ALTER VIEW public.project_inventory_stats SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.has_role(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_any_role(text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_project_manager(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.write_audit_log(text,text,uuid,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_product_status_change() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_any_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_project_manager(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.write_audit_log(text,text,uuid,jsonb,jsonb,jsonb) TO authenticated, service_role;

-- normalize_phone doesn't need search_path since it's IMMUTABLE SQL, but linter still flags it
ALTER FUNCTION public.normalize_phone(text) SET search_path = public;
ALTER FUNCTION public.leads_set_normalized_phone() SET search_path = public;
ALTER FUNCTION public.generate_registration_code() SET search_path = public;
