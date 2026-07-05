# Admin Portal Architecture

## Layout isolation

- Mobile Sales App dùng `MobileShell` (max-w-[520px], BottomNav).
- Admin Portal dùng `AdminShell` (sidebar + header, full-width tới 1400px).
- `src/routes/admin.tsx` là layout route riêng, không lồng dưới MobileShell.
- Route `/admin/*` không hiển thị BottomNav, không giới hạn width mobile.

## Access model

`AdminGuard` (`src/features/admin/AdminGuard.tsx`) kiểm tra client-side:
- Phải active.
- Phải là `super_admin | admin | director | project_director | sales_manager | marketing`.
- Nếu không: redirect `/unauthorized`.

`AdminGuard` chỉ là UX guard. Server-side RLS + server-function `assertCallerRole` là ràng buộc thật.

## Menu visibility

Sidebar (`AdminSidebar`) render item dựa trên helper (`canManageUsers`, `canReadUsers`, `canManageDevelopers`, `canCreateProjects`, `canManageProject`).
Item chưa triển khai đánh dấu "Sắp phát triển" (disabled).

## Global vs project-scoped permissions

- Global (system roles: super_admin/admin/director): quản lý users, developers, tất cả projects.
- Project-scoped: `project_director`/`sales_manager`/`marketing` chỉ quản lý dự án mà họ là member với vai trò tương ứng, thông qua `has_project_role` / `is_project_manager` ở DB.

## User Management

Đặt trong `src/features/admin/users.functions.ts` (TanStack `createServerFn` + `requireSupabaseAuth`, `supabaseAdmin` load lazily bên trong handler). Xem `USER_MANAGEMENT_SECURITY.md`.

## Admin routes

- `/admin` — Dashboard
- `/admin/users` — Danh sách + tạo user
- `/admin/users/$userId` — Chi tiết + assign/remove role
- `/admin/projects` — Danh sách
- `/admin/projects/new` — Tạo
- `/admin/projects/$projectId` — Chi tiết (tab tổng quan; các tab khác đánh dấu Coming Soon)
- `/admin/projects/$projectId/edit` — Chỉnh sửa
- `/admin/developers` — Danh sách + tạo
- `/unauthorized` — Public route hiển thị khi không đủ quyền

## Audit

Trigger chung `audit_row_changes` gắn cho: developers, projects, project_zones, buildings, floors, product_types, project_members, user_roles.
RPC `set_project_primary_contact` cũng ghi `audit_logs`.

## Bulk create floors

RPC `bulk_create_floors(p_project_id, p_building_id, p_start_floor, p_end_floor, p_excluded_floors[], p_code_prefix, p_code_suffix)`:
- Kiểm tra `is_project_manager` + building thuộc project.
- Giới hạn 200 floors.
- Preflight duplicate check trước khi INSERT (atomic).

## Primary contact enforcement

Partial unique index `project_members_one_primary_contact_idx` đảm bảo mỗi project chỉ 1 primary contact. RPC `set_project_primary_contact(project_id, member_id)` thực hiện chuyển đổi trong 1 transaction + kiểm tra quyền.