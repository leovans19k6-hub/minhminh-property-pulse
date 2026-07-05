# Mobile Projects Query (Phase 7A)

`public.get_mobile_projects()` → jsonb array.

Ordering: `is_featured DESC, updated_at DESC, id ASC`.

Row fields: `id, code, slug, name, short_description, location_text, province, district, thumbnail_url, cover_url, logo_url, project_category, status, is_featured, updated_at, developer_id, developer_name, developer_logo_url, total_products, available_count, holding_count, booked_count, sold_count, last_inventory_update`.

`public.get_mobile_project_detail(p_project_id uuid)` → jsonb object:
`{project, developer, inventory_stats, zones[], buildings[], product_types[], featured_products[]}`.

Rejects with `permission_denied` (`42501`) when the caller cannot access the project. `project_not_found` (`P0002`) when the id does not exist for the caller.

`featured_products` is capped at 6, filtered to `status='available'`, ordered by `featured DESC, updated_at DESC`.

Hooks: `useMobileProjects()`, `useMobileProjectDetail(id)` in `src/features/projects/queries.ts`. Query keys: `queryKeys.mobileProjects()`, `queryKeys.mobileProjectDetail(id)`. `staleTime: 60_000`, `retry: 1`.