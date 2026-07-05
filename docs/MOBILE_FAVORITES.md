# Mobile Favorites (Phase 7B)

## RPCs

- `add_mobile_favorite(p_product_id uuid)` — idempotent (`ON CONFLICT DO NOTHING`); rejects if caller cannot access the product.
- `remove_mobile_favorite(p_product_id uuid)` — idempotent.
- `get_mobile_favorites(p_limit int default 30, p_offset int default 0) → jsonb` — returns `{items, total_count, limit, offset, has_more}` ordered by `favorites.created_at DESC`, then `product_code`, then `product_id`. Items joined against `inventory_product_summary` and filtered to the caller's `accessible_mobile_project_ids()` so archived / inaccessible products are hidden without client filtering.

All three are SECURITY DEFINER, `search_path=public`, `REVOKE PUBLIC, anon`, `GRANT authenticated, service_role`.

## Frontend

- `src/services/mobile/favorites.service.ts` — typed wrappers, no localStorage.
- `src/features/favorites/queries.ts` — `useMobileFavorites(limit, offset)`, `useAddMobileFavorite`, `useRemoveMobileFavorite`. Mutations invalidate `mobileProductDetail(productId)` and the `mobile/favorites` key namespace.
- Route `/favorites` renders `MobileInventoryCard` with an inline remove control; empty / loading / error states from `MobileStates`.

## Table

`public.favorites (user_id, product_id, created_at)` — RLS `favorites_own` restricts to `auth.uid()` for active users. Client also writes through the RPCs so access-checking stays server-authoritative.

## Not yet implemented

Inventory list cards do not yet reflect per-card favorite state (would require N+1 or a summary column). Product Detail and Favorites List are authoritative surfaces for the favorite action in 7B.