# Inventory Views (Phase 5E)

Views drive dynamic columns on Admin inventory grid + mobile lists.

## Schema

- `inventory_views(project_id, name, code, view_type, is_default, status, …)`
- `inventory_view_fields(inventory_view_id, field_source, core_field_key | field_definition_id | price_code, display_order, visible, …)` — exactly one of the three targets populated (server-enforced).

## Trusted RPCs

| RPC | Purpose |
|-----|---------|
| `save_inventory_view_fields(view_id, fields)` | Atomic replace-all. Validates shape, allow-lists core keys, price_code ∈ {primary,secondary,vat,total,discount}, rejects duplicates, caps 100. |
| `duplicate_inventory_view(source_id, name, code)` | Atomic clone (view + fields). |
| `set_default_inventory_view(view_id)` | Unset other defaults of same view_type; sync `project_inventory_settings.default_admin_view_id` / `default_mobile_view_id`. |
| `validate_inventory_view(view_id)` | `{ is_valid, errors, warnings, field_count }`. |

All require `is_active_user` + `is_project_manager(project_id)`.

## Client

`src/services/admin/inventoryViews.service.ts` exports `saveInventoryViewFields`, `duplicateInventoryView`, `setDefaultViewRpc`, `validateInventoryViewRpc`. `ViewFieldsDialog` still edits per-row (each individually atomic); bulk import/template flows use the atomic RPC.

## Failure modes

`too_many_fields_max_100` · `invalid_field_source` · `invalid_core_field_key` · `invalid_price_code` · `field_definition_wrong_project` · `field_definition_not_active_or_missing` · `duplicate_field` · `code_already_exists`.