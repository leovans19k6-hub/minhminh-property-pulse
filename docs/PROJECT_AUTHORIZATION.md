# Project Authorization

## Layer 1 — RLS active-user gate

Toàn bộ RLS policy nghiệp vụ yêu cầu `public.is_active_user()`.
User có `profiles.status != 'active'` không đọc/ghi được dữ liệu nghiệp vụ (projects, products, prices, policies, vouchers, events, leads, registrations, favorites, notifications, import jobs).

`profiles`, `roles`, `user_roles`, `lead_sources` giữ nguyên để bootstrap auth flow. AuthProvider fetch profile trước — nếu inactive, dừng và không query roles/memberships.

## Layer 2 — Global vs project-scoped

| Table | Read | Write |
|---|---|---|
| developers | active + (developer.status=active OR admin/director) | super_admin/admin/director |
| projects | active | admin/director OR `is_project_manager(id)` |
| project_zones/buildings/floors/product_types(project)/documents/policies/vouchers/events | active | `is_project_manager(project_id)` |
| project_members | active | admin/director OR `has_project_role(project_id, ['project_director','admin'])` |
| products/product_media/product_price_options | active | `is_project_manager(project_id)` |
| products delete | active | super_admin/admin |
| leads | own OR admin/director OR project manager of `interested_project_id` | active |
| registrations | own OR admin/director OR project manager of `project_id` | active |

## Layer 3 — Client-side guards

`src/features/admin/access.ts`:
- `canAccessAdminPortal`
- `canReadUsers` / `canManageUsers`
- `canManageDevelopers`
- `canCreateProjects`
- `canManageProject(ctx, projectId)`
- `assignableRoles(ctx)` — hạn chế gán role: admin không được gán `super_admin` hoặc `admin`.

Đây chỉ để UX — RLS/server-fn vẫn enforce.

## Primary contact

Ràng buộc DB: `project_members_one_primary_contact_idx` (partial unique).
Chuyển primary: gọi RPC `set_project_primary_contact` (atomic).

## Bulk floors

`bulk_create_floors` RPC:
- Verify `is_project_manager(project_id)`.
- Verify building thuộc project.
- Max 200 floors, preflight duplicate check, atomic INSERT trong transaction.

## Audit

`audit_row_changes` trigger AFTER INSERT/UPDATE/DELETE cho: developers, projects, project_zones, buildings, floors, product_types, project_members, user_roles.
Bỏ qua UPDATE không thay đổi. `audit_logs` không cho phép authenticated INSERT/UPDATE/DELETE trực tiếp — chỉ trigger (SECURITY DEFINER) và service_role ghi được.