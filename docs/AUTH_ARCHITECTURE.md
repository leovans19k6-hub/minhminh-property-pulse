# Auth Architecture — Minh Minh Sales Hub

## Tổng quan

- Xác thực qua Supabase Auth (email + password ở bước này).
- Session do Supabase JS client tự quản lý (localStorage). Không lưu token thủ công.
- Tài khoản do quản trị viên cấp; không có public signup.
- RLS là biên bảo mật cuối cùng; permission client-side chỉ để render UI.

## Session lifecycle

1. App khởi động → `AuthProvider` mount.
2. Đăng ký `onAuthStateChange` TRƯỚC khi gọi `getSession()` — tránh race condition.
3. Có session → `fetchCurrentUserContext(userId, email)` lấy profile + system roles + project memberships.
4. Compute permissions từ `systemRoles` (`permissions.ts`).
5. Đang resolve → `AuthLoadingScreen`.
6. `TOKEN_REFRESHED` không reload context; `SIGNED_IN` / `USER_UPDATED` / `INITIAL_SESSION` reload.
7. `SIGNED_OUT` → clear currentUser + `queryClient.clear()`.

## CurrentUserContext

```
userId, email, profile,
systemRoles: string[],
projectMemberships: { projectId, memberRole, isPrimaryContact }[],
permissions: Set<string>,
isSuperAdmin, isAdmin, isDirector, isActive
```

## System roles vs Project member roles

- System roles (`roles` + `user_roles`): `super_admin`, `admin`, `director`,
  `project_director`, `sales_manager`, `sales`, `marketing`, `staff`.
  DB dùng `has_role` / `has_any_role`.
- Project member roles (`project_members.member_role`): `primary_contact`,
  `project_director`, `sales_director`, `sales_manager`, `marketing_lead`,
  `marketing`, `coordinator`, `viewer`, `admin`…
  DB dùng `has_project_role(project_id, roles[])`.
- `is_project_manager(project_id)` chấp nhận cả system role đặc quyền
  HOẶC member role quản lý dự án.

## Permission model

`src/features/auth/permissions.ts`:

- `super_admin` / `admin`: all.
- `director`: đọc toàn hệ thống + quản lý phần lớn + audit read.
- `project_director` / `sales_manager`: manager base (RLS bổ sung ràng buộc membership).
- `sales`: đọc dự án/bảng hàng + lead/registration.
- `marketing`: đọc dự án/bảng hàng + policy/voucher/event.
- `staff`: read-only.

## Route access

- Public: `/login`, `/forgot-password`, `/reset-password`.
- Protected: tất cả route còn lại.
- `RouteGate` trong `__root.tsx` chọn `AuthGuard` hoặc render trực tiếp `<Outlet />`.
- `AuthGuard`: Loading → Redirect(`/login?returnUrl=...`) → DisabledAccountScreen → children.
- `GuestGuard` (login/forgot-password): đã đăng nhập → `/`.
- `returnUrl` được `sanitizeReturnUrl` — chỉ same-origin path (`/...`).

## Bootstrap Super Admin

Xem `docs/BOOTSTRAP_SUPER_ADMIN.md`. Frontend không có UI bootstrap.

## Disabled account

- `profiles.status != 'active'` → `DisabledAccountScreen` + Đăng xuất.
- DB helper `public.is_active_user()` sẵn sàng dùng trong policy tương lai.

## Logout hygiene

`AuthProvider.signOut()`:
1. `queryClient.cancelQueries()`
2. `queryClient.clear()`
3. `supabase.auth.signOut()`

`/account` navigate `/login` với `replace: true`.

## Password recovery

- `/forgot-password`: `resetPasswordForEmail` với `redirectTo = origin + /reset-password`.
- `/reset-password`: chỉ cho đổi khi có event `PASSWORD_RECOVERY` hoặc URL hash `type=recovery`.

## Audit log

- Authenticated client không insert được `audit_logs` và không execute được `write_audit_log`.
- Chỉ `service_role` hoặc trigger SECURITY DEFINER được ghi.
- Chỉ `super_admin` / `admin` / `director` được đọc.