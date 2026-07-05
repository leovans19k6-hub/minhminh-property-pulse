# Realtime Inventory (Phase 5E)

## Published tables

`ALTER PUBLICATION supabase_realtime ADD TABLE …`:
- `products`
- `product_price_options`
- `product_custom_values` *(added 5E)*
- `inventory_view_fields` *(added 5E)*
- (pre-existing) `sales_policies`, `vouchers`, `events`

## Subscription pattern

Always inside `useEffect`, always return the unsubscribe callback:

```ts
useEffect(() => {
  const off = subscribeToInventory({
    table: "products",
    filter: `project_id=eq.${projectId}`,
    onChange: () => qc.invalidateQueries({ queryKey: [...] }),
  });
  return off;
}, [projectId]);
```

## Invalidation guide

| Change | Invalidate |
|--------|-----------|
| `products` | list + detail + stats |
| `product_price_options` | list (primary price column) + detail |
| `product_custom_values` | list (only if dynamic columns include it) + detail always |
| `inventory_view_fields` | view config + list columns |

## Debounce

High-frequency bursts (import commit) can trigger many events. Debounce `invalidateQueries` by 300ms in write-heavy call sites. Not global — apply per subscriber as needed.