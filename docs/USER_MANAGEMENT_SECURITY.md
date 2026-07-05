# User Management Security

## Edge Function vs TanStack Server Function

Dự án dùng **TanStack `createServerFn`** (không dùng Supabase Edge Function) theo chuẩn stack modern trong knowledge card `server-side-modern`. `supabaseAdmin` được import lazily bên trong handler (`await import("@/integrations/supabase/client.server")`) để không leak service_role vào client bundle.

## Nguyên tắc chung

- `requireSupabaseAuth` xác thực JWT từ header (client attacher đính token vào mọi server fn).
- `assertCallerRole` (trong `users.functions.ts`) kiểm tra:
  - Caller có profile.
  - `status = active`.
  - Có ít nhất một role trong `readRoles` (list/get) hoặc `privilegedRoles` (create/update/disable/assign).
- Không tin permission client gửi lên. Frontend guard chỉ để UX.

## Safety rules

- **`super_admin`**: chỉ super_admin khác được gán/xóa/quản lý (disable, enable, remove_role).
- **`admin`**: chỉ super_admin được gán/xóa role `admin` hoặc `super_admin`.
- **Không disable super_admin cuối cùng**: `setUserStatus` gọi `countSuperAdmins()` trước khi disable.
- **Không remove role super_admin cuối cùng**: `removeUserRole` chặn nếu `count <= 1`.
- **Self-disable**: nếu caller là super_admin duy nhất, không cho tự disable.
- **Delete auth user**: không triển khai ở bước này.

## Password

- `createAdminUser` yêu cầu mật khẩu ≥10 ký tự.
- Không log password, không lưu, không hiển thị lại sau khi dialog đóng.

## PII / return shape

- Server fn không trả về access_token/refresh_token/hash.
- Chỉ trả về profile + email (lấy từ auth admin) + role list.

## Audit

Mỗi operation ghi `audit_logs`:
- `admin_create_user`, `admin_enable_user`, `admin_disable_user`.
- Role assign/remove được ghi qua trigger `audit_user_roles`.
- Set primary contact ghi qua `set_project_primary_contact`.

## RLS interactions

- Trong `users.functions.ts`, `assertCallerRole` chạy trên `context.supabase` (bearer của caller → RLS enforce như user).
- Các query privileged tiếp theo dùng `supabaseAdmin` (bypass RLS) — chỉ sau khi kiểm tra quyền thành công.
- Frontend không bao giờ query `auth.users`.

## SECURITY DEFINER helpers

Các hàm RLS helper (`has_role`, `has_any_role`, `has_project_role`, `is_project_member`, `is_project_manager`, `is_active_user`) buộc phải `SECURITY DEFINER` để đọc `user_roles`/`profiles` mà không bị RLS chặn. Linter Supabase (`0029_authenticated_security_definer_function_executable`) sẽ báo WARN cho pattern này — đây là **false positive**: đó là pattern chuẩn Supabase docs cho RLS role check, chỉ `authenticated` mới execute được, và tất cả đều `SET search_path = public`.