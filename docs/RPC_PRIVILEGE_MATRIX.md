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

## Phase 6A — Sales Policies additions

### Authenticated + service_role (REVOKE anon)
- `create_sales_policy`, `update_sales_policy`, `publish_sales_policy`, `unpublish_sales_policy`, `clone_sales_policy`, `archive_sales_policy`, `restore_sales_policy`
- `get_sales_policy_admin_detail`, `search_sales_policies`, `get_active_project_policies`

### Internal only (REVOKE PUBLIC, anon, authenticated)
- `validate_sales_policy_content`, `validate_sales_policy_attachments`, `validate_sales_policy_dates`, `validate_sales_policy_slug`, `validate_policy_applicability`
- `create_sales_policy_version`
- `_apply_policy_applicability`

All Phase 6A functions use `SECURITY DEFINER` + `SET search_path = public`. User-facing RPCs self-authorize (`auth.uid()` + `is_active_user()` + `is_project_manager()`); direct writes to `sales_policies`, `policy_product_types`, `policy_products`, `sales_policy_versions` are denied by RLS.

## Phase 6B — Vouchers additions

### Authenticated + service_role (REVOKE anon)
- `create_voucher`, `update_voucher`, `publish_voucher`, `pause_voucher`, `resume_voucher`, `clone_voucher`, `archive_voucher`, `restore_voucher`
- `check_voucher_eligibility`, `register_for_voucher`, `cancel_my_voucher_registration`
- `get_voucher_admin_detail`, `search_vouchers`, `get_active_project_vouchers`, `get_active_voucher_detail`, `get_my_voucher_registrations`

### Internal only (REVOKE PUBLIC, anon, authenticated)
- `validate_voucher_benefits`, `validate_voucher_conditions`, `validate_voucher_attachments`, `validate_voucher_dates`
- `_apply_voucher_applicability`
- `_voucher_registration_count`

All Phase 6B functions use `SECURITY DEFINER` + `SET search_path = public`. User-facing RPCs self-authorize; direct writes to `vouchers`, `voucher_product_types`, `voucher_products`, `voucher_sales_policies` are denied by RLS. Voucher registrations are denied at the `registrations_insert` policy (`registration_type <> 'voucher'`) — the only path is `register_for_voucher`, which serializes concurrent callers via `pg_advisory_xact_lock` to prevent overbooking.

## Phase 6C — Event Management additions

### Authenticated + service_role (REVOKE anon)
- `create_event`, `update_event`, `publish_event`, `pause_event`, `resume_event`, `cancel_event`, `complete_event`, `clone_event`, `archive_event`, `restore_event`
- `check_event_eligibility`, `register_for_event`, `cancel_my_event_registration`
- `get_event_admin_detail`, `search_events`, `get_active_project_events`, `get_active_event_detail`, `get_my_event_registrations`

### Internal only (REVOKE PUBLIC, anon, authenticated)
- `validate_event_dates`, `validate_event_location`, `validate_site_tour_details`, `validate_event_agenda`, `validate_event_speakers`, `validate_event_attachments`, `validate_event_session_row`
- `_apply_event_audience`, `_apply_event_sessions`, `_event_registration_count`, `event_derived_state`

All Phase 6C functions use `SECURITY DEFINER` + `SET search_path = public`. User-facing RPCs self-authorize (`auth.uid()` + `is_active_user()` + `is_project_manager()`); direct writes to `events`, `event_sessions`, `event_product_types`, `event_products`, `event_sales_policies`, `event_vouchers` are denied by RLS. Event registrations are denied at `registrations_insert` (`registration_type NOT IN ('voucher','event','site_tour')`) — the only paths are `register_for_event` (Event Engine) and `register_for_voucher` (Voucher Engine). Both serialize concurrent callers via `pg_advisory_xact_lock`; the Event lock uses seed `43` to avoid collisions with the Voucher lock seed `42`.