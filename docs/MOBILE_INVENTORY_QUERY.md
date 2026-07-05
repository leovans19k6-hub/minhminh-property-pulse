# Mobile Inventory Query (Phase 7A)

`public.search_mobile_inventory(p_project_id, p_query, p_category, p_zone_id, p_building_id, p_product_type_id, p_status, p_floor_min, p_floor_max, p_area_min, p_area_max, p_price_min, p_price_max, p_direction, p_limit, p_offset)` → jsonb `{items, total_count, limit, offset, has_more}`.

Rules:
- Active caller required. When `p_project_id` supplied, caller must access that project. Otherwise scoped to `accessible_mobile_project_ids()`.
- `limit` is capped at `100`.
- Deterministic order: `featured DESC NULLS LAST, updated_at DESC, product_code ASC, product_id ASC`.
- Text query does `ILIKE` on `product_code | product_name | project_name`.
- Area filter matches the first non-null of `built_up_area, carpet_area, construction_area, land_area`.
- Direction matches `direction | balcony_direction | door_direction`.

Items are rows from `public.inventory_product_summary` (see project inventory views), which already exclude admin-only columns like cost and internal pricing.

Hook: `useMobileInventory(filters)` in `src/features/inventory/queries.ts` — `useInfiniteQuery`, page size 30, `getNextPageParam` from `has_more/offset`. Text query is debounced 300 ms at the route level and stored in the URL (`?q=`).