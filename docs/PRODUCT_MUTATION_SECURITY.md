# Product Mutation Security (Phase 5E)

All product mutations go through **atomic RPCs** — no client-side multi-step writes.

## Entry points

| RPC | Purpose | Caller |
|-----|---------|--------|
| `create_product_with_values(project_id, core, custom, prices)` | Atomic create: products + custom values + price options | project manager |
| `update_product_with_values(product_id, core?, custom?, prices?)` | Atomic partial update | project manager |
| `clone_product(source_id, new_code)` | Clone core + custom + active prices (not media/history/favorites) | project manager |
| `archive_product(product_id, reason?)` | Soft-archive, idempotent | project manager |
| `restore_product(product_id)` | Restore; re-validates relationships + required custom fields | project manager |
| `get_product_admin_detail(product_id)` | Read full admin payload w/ permissions | project member OR super/admin/director |

## Authorization

Every mutation performs (in order): `auth.uid()` → `is_active_user()` → resolve `project_id` from DB → `is_project_manager(project_id)`. Frontend flags are advisory only.

## Custom values contract

Payload: `{ "<field_key>": <value> }`. Missing key = unchanged. Explicit `null` = clear. After apply, all `is_required` fields (respecting product_type scope) must have a value.

## Validation rules (server-side)

- `integer`/`decimal`: `min`, `max`
- `text`/`long_text`/`url`/`phone`: `min_length`, `max_length`, `pattern` (POSIX regex)
- `single_select`/`multi_select`: value(s) ∈ active `product_field_options`

## Relationships

`validate_product_relationships`: zone ∈ project; building ∈ project & (if given) zone; floor ∈ building; product_type global or same project.

## Restore semantics

Strict: re-runs relationship validation and rejects restore if current required custom values are missing.

## Audit

Every mutation writes one `audit_logs` row (`create_product`, `update_product`, `clone_product`, `archive_product`, `restore_product`).