# Product Pricing (Phase 5E)

## Schema

`product_price_options(price_code, amount CHECK ≥ 0, currency, is_primary, status, …)`.

**Unique partial index** — one primary active per product:
```sql
CREATE UNIQUE INDEX product_price_options_one_primary_active
  ON product_price_options (product_id) WHERE is_primary = true AND status = 'active';
```

## Write path

Prices flow only through `create_product_with_values` / `update_product_with_values`. Never `.insert()`/`.update()` directly.

`_apply_product_prices`:
- ≤ 50 items per payload
- unique `price_code` in payload
- ≤ 1 primary active
- absent codes → soft-archive (`status='archived'`)

## Price history

Trigger `log_product_price_change` inserts on CREATE and on change of {amount, currency, status, is_primary}. Immutable.

## UI

`ProductFormDialog` Pricing section — add/remove rows, mark primary, currency, amount. Client validates first for UX; server re-validates.