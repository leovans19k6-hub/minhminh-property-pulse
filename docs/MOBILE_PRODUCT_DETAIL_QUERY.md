# Mobile Product Detail Query (Phase 7B)

`get_mobile_product_detail(p_product_id uuid) → jsonb` — SECURITY DEFINER, `search_path=public`, granted to `authenticated, service_role`. Raises `permission_denied` (42501) when the caller is not active or cannot access the product's project, `product_not_found` (P0002) when the product is missing or archived.

## Access model

`can_access_mobile_product(product_id)` = `can_access_mobile_project(project_id)` AND `products.archived_at IS NULL`. No client-side filtering.

## Payload shape

```
{
  product: { id, project_id, product_code, product_name, category, status, ... },
  project: { id, name, slug, code, location_text, thumbnail_url, cover_url, ... },
  developer, zone, building, floor, product_type,
  media: [...],                       // active media, ordered
  price_options: [...],               // status='active', primary first
  custom_fields: [...],               // mobile-visible defs with a stored value
  price_history_summary,              // { can_view, ... }
  status_history_summary,             // { can_view, ... }
  applicable_policies: [...],         // ≤5, from get_active_project_policies
  project_vouchers: [...],            // ≤5, from get_active_project_vouchers
  upcoming_events: [...],             // ≤5, from get_active_project_events
  primary_contact,                    // resolved via _resolve_mobile_primary_contact
  permissions: { is_favorite, can_view_history }
}
```

History summaries are visible only to `super_admin/admin/director` or project managers (`can_view_history`); ordinary sales users see `{can_view:false}` with no values.

## Frontend

`src/services/mobile/products.service.ts` → `getMobileProductDetail(productId)` returns typed `MobileProductDetail`. Hook `useMobileProductDetail` in `src/features/products/queries.ts` uses stale-time 30s and does not retry `permission_denied`/`product_not_found`.

Route: `/products/$productId` (`src/routes/products.$productId.tsx`) — full loading / error / not-found / success states, no mock fallback.