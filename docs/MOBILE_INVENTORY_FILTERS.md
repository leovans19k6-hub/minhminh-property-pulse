# Mobile Inventory Filters (Phase 7A)

`public.get_mobile_inventory_filters(p_project_id uuid default null)` → jsonb `{projects, zones, buildings, product_types, categories, statuses, directions, floor_min, floor_max, price_min, price_max}`.

All options are derived from currently accessible + non-archived data. When `p_project_id` is supplied, options are scoped to that project.

URL model for `/inventory` — applied filters only. Editing filters keeps a local draft in the sheet; **Apply** writes to the URL, which resets pagination. **Clear** removes optional filters but preserves `projectId` context if entered from a Project Detail. Zone/building/type resets when the project changes.