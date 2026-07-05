# Mobile Product Realtime (Phase 7B)

`src/routes/products.$productId.tsx` opens a single channel per open product detail (`mobile-product-<productId>`) that subscribes to `postgres_changes` on:

- `products` filtered by `id=eq.<productId>`
- `product_price_options` filtered by `product_id=eq.<productId>`
- `product_custom_values` filtered by `product_id=eq.<productId>`
- `sales_policies`, `vouchers`, `events` filtered by `project_id=eq.<projectId>`

Any event triggers a 700 ms debounced `queryClient.invalidateQueries(mobileProductDetail(productId))` which refetches through `get_mobile_product_detail` — server-authoritative visibility filters (`can_access_mobile_project`, `archived_at`, policy applicability, active state) are re-evaluated per refetch.

Realtime enforces the same RLS as regular reads. History tables (`product_price_history`, `product_status_history`) are NOT subscribed to on the mobile client — those summaries are re-derived through the RPC on the same debounce.

Cleanup: `supabase.removeChannel` on unmount / data change. No cross-project channels are opened from the mobile detail; project detail keeps its per-project stats channel via inventory. No duplicate subscribers.