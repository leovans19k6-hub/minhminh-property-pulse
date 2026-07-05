# Product History (Phase 5E)

## Sources

- `product_status_history` — filled by trigger `log_product_status_change`.
- `product_price_history` — filled by trigger `log_product_price_change` *(added 5E)*.

Append-only. No client INSERT/UPDATE/DELETE policies.

## Read paths

1. `get_product_admin_detail(product_id)` — bundled with core/custom/prices (LIMIT 100 each).
2. `ProductHistoryDialog` — direct table SELECTs, RLS-scoped to project members.

## Ordering

Descending timestamps (`created_at` / `changed_at`). Deterministic.

## Archived products

History remains readable after `archive_product` — auditing must survive soft-delete.