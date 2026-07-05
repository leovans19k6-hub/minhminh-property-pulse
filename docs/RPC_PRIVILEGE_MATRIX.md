# RPC Privilege Matrix (Phase 5E)

All SECURITY DEFINER RPCs `SET search_path = public`; user-callable ones do inline `auth.uid()` + `is_active_user()` + authorization check.

## Service-role only

REVOKE from PUBLIC, anon, authenticated:
- `write_audit_log(text, text, uuid, jsonb, jsonb, jsonb)` — audit writes are internal.
- `bootstrap_super_admin(uuid)` — one-shot; must not be reachable from a session.
- `_apply_product_custom_values(uuid, uuid, uuid, jsonb)` — internal helper.
- `_apply_product_prices(uuid, jsonb)` — internal helper.

## Authenticated + service_role (REVOKE anon)

**Readers**: `search_inventory`, `get_product_detail`, `get_product_admin_detail`.

**Field/value tools**: `set_product_custom_values`.

**Views trusted ops**: `save_inventory_view_fields`, `duplicate_inventory_view`, `set_default_inventory_view`, `validate_inventory_view`.

**Product Mutation Engine**: `create_product_with_values`, `update_product_with_values`, `clone_product`, `archive_product`, `restore_product`.

**Templates & Import**: `apply_inventory_template`, `snapshot_template_from_project`, `inventory_import_add_rows`, `commit_inventory_import`.

**Project ops**: `bulk_create_floors`, `set_project_primary_contact`.

## RLS helper functions (default PUBLIC EXECUTE — required)

Used inside RLS `USING`/`WITH CHECK`; must remain callable by the policy evaluator (`SECURITY DEFINER` + `STABLE`): `has_role`, `has_any_role`, `has_project_role`, `is_project_member`, `is_project_manager`, `is_active_user`, `is_reserved_product_field_key`, `validate_product_relationships`.

## Linter note

Supabase linter rules `0028`/`0029` flag every SECURITY DEFINER function callable by anon/authenticated. Phase 5E intentionally keeps user-facing mutation RPCs SECURITY DEFINER with inline authorization — this is the documented pattern for RLS-bypass RPCs. Warnings acknowledged, not suppressed.