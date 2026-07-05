# Sales Policy — Security

## Auth chain (every user-facing mutation RPC)

1. `auth.uid() IS NOT NULL` else `permission_denied`.
2. `is_active_user()` else `permission_denied`.
3. Fetch policy row (`SELECT ... FOR UPDATE` where write).
4. `is_project_manager(v_policy.project_id)` else `permission_denied`.
5. Business validation (content, attachments, dates, applicability, cross-project).
6. Mutate.
7. `create_sales_policy_version(...)` if applicable.
8. Summary `audit_logs` row (`user_id = auth.uid()`).

Never trust frontend permissions or project id; always resolve from the row.

## Direct client writes: DENIED

RLS policies on `sales_policies`, `policy_product_types`, `policy_products` explicitly deny direct `INSERT/UPDATE/DELETE` for `authenticated`. The Data API cannot bypass a SECURITY DEFINER RPC even for a project manager.

`sales_policy_versions` denies `INSERT/UPDATE/DELETE` for `authenticated`. Only `create_sales_policy_version` (SECURITY DEFINER, EXECUTE revoked from PUBLIC/anon/authenticated) writes rows.

## Reads

- `sales_policies` SELECT: existing project-scoped read policy (system admins/directors + project members).
- `sales_policy_versions` SELECT: same audience.
- Archived policies remain readable to authorized users.
- Anonymous users: no access to any policy table.

## RPC privilege matrix additions

### Authenticated + service_role (REVOKE PUBLIC, anon)
- `create_sales_policy`, `update_sales_policy`, `publish_sales_policy`, `unpublish_sales_policy`, `clone_sales_policy`, `archive_sales_policy`, `restore_sales_policy`
- `get_sales_policy_admin_detail`, `search_sales_policies`, `get_active_project_policies`

### Internal only (REVOKE PUBLIC, anon, authenticated)
- `validate_sales_policy_content`, `validate_sales_policy_attachments`, `validate_sales_policy_dates`, `validate_sales_policy_slug`, `validate_policy_applicability`
- `create_sales_policy_version`
- `_apply_policy_applicability`

All SECURITY DEFINER functions above use `SET search_path = public` to eliminate schema-hijacking. Callable-by-signed-in-users linter warnings are expected for the user-facing RPCs (they self-authorize).

## Error mapping (RPC → UI)

`permission_denied`, `policy_not_found`, `policy_archived`, `policy_not_archived`, `policy_publish_validation_failed`, `duplicate_policy_slug`, `invalid_policy_slug`, `invalid_policy_content`, `too_many_policy_sections`, `duplicate_policy_section_id`, `invalid_policy_attachment`, `too_many_policy_attachments`, `invalid_policy_dates`, `invalid_policy_product`, `invalid_policy_product_type`, `cross_project_policy_reference`.

UI shows friendly Vietnamese messages. Raw SQL error text is never surfaced.
