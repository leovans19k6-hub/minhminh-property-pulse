
REVOKE EXECUTE ON FUNCTION public.validate_product_field_definition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_product_custom_value() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_product_field_key_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_product_field_option_value_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_inventory_view_field() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_project_inventory_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_reserved_product_field_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_reserved_product_field_key(text) TO authenticated;
