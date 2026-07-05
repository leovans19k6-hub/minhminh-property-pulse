# Mobile Sales App — Data Architecture (Phase 7A)

Mobile routes are read-only Supabase-backed for **Projects** and **Inventory**. All other modules (favorites, product detail, policies, vouchers, events, registrations, notifications) remain on mock data until later phases.

## Access model

`can_access_mobile_project(uuid)` — an active user can view a project when:

- `profiles.status = 'active'`.
- `projects.archived_at IS NULL`.
- User is a member of the project (`project_members`), OR has one of `super_admin` / `admin` / `director` roles.

`accessible_mobile_project_ids()` returns the set of project ids the caller can see. All mobile RPCs use it — no client-side project filtering.

## Data flow

`UI → TanStack Query hooks (src/features/{projects,inventory}/queries.ts) → src/services/mobile/*.service.ts → supabase.rpc(...)`.

Routes never import the supabase client directly. Admin services are never imported into mobile routes.

## RPCs (see docs/RPC_PRIVILEGE_MATRIX.md)

- `get_mobile_projects()`
- `get_mobile_project_detail(uuid)`
- `search_mobile_inventory(...)` → `{items,total_count,limit,offset,has_more}`
- `get_mobile_inventory_filters(uuid?)`

All SECURITY DEFINER, `search_path=public`, `REVOKE PUBLIC/anon`, `GRANT authenticated, service_role`.

## Status per route

| Route | Data source |
| --- | --- |
| `/` Home — projects section | Supabase (`get_mobile_projects`) |
| `/` Home — featured products, policies, vouchers, events | **Mock** (out of scope for 7A) |
| `/projects` | Supabase |
| `/projects/$projectId` | Supabase |
| `/inventory` | Supabase (paginated + realtime) |
| `/products/$productId` | Supabase (`get_mobile_product_detail` + realtime) |
| `/favorites` | Supabase (`get_mobile_favorites` / `add_/remove_mobile_favorite`) |
| `/notifications`, `/register`, `/policies` | **Mock** |

## Phase 7B additions

- `get_mobile_product_detail(uuid)` — see `MOBILE_PRODUCT_DETAIL_QUERY.md`.
- `add_mobile_favorite`, `remove_mobile_favorite`, `get_mobile_favorites` — see `MOBILE_FAVORITES.md`.
- Primary contact resolver `_resolve_mobile_primary_contact(uuid)` (service-role only) is embedded in `get_mobile_project_detail` and `get_mobile_product_detail`.
- Realtime for product detail is described in `MOBILE_PRODUCT_REALTIME.md`.

Policy, voucher, event mobile *detail* routes and registration flows remain unshipped (Phase 7C).