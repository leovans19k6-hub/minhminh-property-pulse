# Mobile Product Realtime (Phase 7B / 7B.1)

`src/routes/products.$productId.tsx` opens a single channel per open product detail (`mobile-product-<productId>`). Subscribes to `postgres_changes` on **product-scoped tables only**:

- `products` filtered by `id=eq.<productId>`
- `product_price_options` filtered by `product_id=eq.<productId>`
- `product_custom_values` filtered by `product_id=eq.<productId>`
- `product_media` filtered by `product_id=eq.<productId>` (added Phase 7B.1)

All four tables are members of the `supabase_realtime` publication.

Any event triggers a 700 ms debounced `queryClient.invalidateQueries(mobileProductDetail(productId))`, which refetches `get_mobile_product_detail` — server-authoritative visibility filters (`can_access_mobile_project`, `archived_at`, policy applicability, active state, `can_view_history`) are re-evaluated per refetch.

## Why Policy / Voucher / Event realtime is intentionally skipped

Subscribing every opened Product Detail to `sales_policies`, `vouchers`, and `events` filtered by `project_id` creates one project-wide channel per product, duplicated across every product opened in the same project, and produces noisy invalidation for changes that never affect the current product. Phase 7B.1 removes those subscriptions.

Policy / voucher / event previews on Product Detail stay fresh via TanStack Query defaults: `staleTime: 30_000`, `refetchOnWindowFocus`, `refetchOnReconnect`. Opening the dedicated Policy / Voucher / Event detail pages (Phase 7C) will use their own scoped subscriptions.

History tables (`product_price_history`, `product_status_history`) are NOT subscribed to — summaries are re-derived through the RPC on the same debounce.

## Cleanup / correctness

- Effect depends on `currentProductId` only, so navigating between products tears down the prior channel and creates a fresh one.
- `supabase.removeChannel(channel)` and `clearTimeout(timer)` run on unmount and on productId change.
- No cross-project channels are opened from Product Detail.
- Project Detail keeps its per-project stats channel via inventory; not duplicated here.