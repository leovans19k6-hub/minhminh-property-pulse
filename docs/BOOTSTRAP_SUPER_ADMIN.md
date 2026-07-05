# Bootstrap Super Admin

Ứng dụng không cho phép người dùng tự cấp vai trò `super_admin`. Tài khoản quản
trị hệ thống đầu tiên phải được khởi tạo an toàn thông qua hàm database
`public.bootstrap_super_admin(uuid)` — chỉ chạy được từ ngữ cảnh quản trị
(service_role / SQL editor với quyền quản trị).

## Quy trình

### 1. Tạo user đầu tiên

Vào Lovable Cloud → Backend → Users → Add user:

- Email: `admin@minhminh.vn` (hoặc email quản trị chính thức)
- Password: mật khẩu mạnh
- Confirm email: ON

Trigger `handle_new_user` sẽ tự động tạo profile với `status = 'active'`.

### 2. Lấy `user_id`

```sql
SELECT id, email FROM auth.users WHERE email = 'admin@minhminh.vn';
```

### 3. Gọi hàm bootstrap

Trong SQL Editor (quyền quản trị):

```sql
SELECT public.bootstrap_super_admin('PASTE-USER-UUID-HERE'::uuid);
```

Hàm sẽ: kiểm tra user tồn tại, đảm bảo profile active, từ chối nếu đã có
`super_admin` khác, cấp role `super_admin`, ghi audit log.

### 4. Xác minh

```sql
SELECT u.email, r.code
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
JOIN public.roles r ON r.id = ur.role_id
WHERE r.code = 'super_admin';
```

### 5. Đăng nhập

Mở app → `/login` → đăng nhập → vào `/account` để kiểm tra vai trò.

## Bảo mật

- Hàm đã `REVOKE EXECUTE` cho `anon` và `authenticated`.
- Không hard-code email, password hay `service_role key` trong mã nguồn.
- Không gọi hàm này từ frontend.
- Chạy được tối đa một lần — lần thứ hai raise exception.
- Cấp thêm quản trị viên sau này qua Admin Portal (bước sau).