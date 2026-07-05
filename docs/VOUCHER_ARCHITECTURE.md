# Voucher Architecture (Phase 6B)

## Domain
Voucher là ưu đãi có thời hạn, gắn với một dự án; có phạm vi áp dụng (project-wide, loại SP, SP cụ thể, chính sách, mixed) và cấu trúc quyền lợi/điều kiện tường minh.

## Schema additions (`vouchers`)
- `code text` (unique per project, case-insensitive) — mã voucher công khai; tuỳ chọn.
- `benefits_json jsonb[]`, `conditions_json jsonb[]`, `attachments jsonb[]` — nội dung có cấu trúc.
- `applicability_scope text` in `{project_wide, product_types, specific_products, sales_policies, mixed}`.
- `priority integer default 0`, `per_user_limit integer default 1`.
- `registration_start timestamptz`, `published_at timestamptz`, `created_by`, `updated_by`.
- Trạng thái mở rộng: `paused`.
- Trường hiện có: `effective_from`/`effective_to` được coi là `valid_from`/`valid_to`; `quantity` = capacity; `registered_count` = cached count (không phải nguồn sự thật).

## Applicability tables
`voucher_product_types`, `voucher_products`, `voucher_sales_policies` (PK composite). Không có relation ↔ `project_wide`. Nhiều relation kết hợp ↔ `mixed`.

## Lifecycle
`draft` → `active` (publish) ↔ `paused` → `archived`. Restore → `draft`. Không xoá vật lý.

## Derived state
`voucher_derived_state(voucher_id)` trả một trong: `draft`, `upcoming_registration`, `open`, `full`, `registration_closed`, `upcoming_validity`, `valid`, `expired`, `paused`, `archived`.

## Mutation RPCs
`create_voucher`, `update_voucher`, `publish_voucher`, `pause_voucher`, `resume_voucher`, `clone_voucher`, `archive_voucher`, `restore_voucher`. Mọi RPC `SECURITY DEFINER` + `SET search_path = public`, self-authorize (`auth.uid` + `is_active_user` + `is_project_manager`) + audit.

## Query RPCs
`get_voucher_admin_detail`, `search_vouchers`, `get_active_project_vouchers`, `get_active_voucher_detail`, `get_my_voucher_registrations`.

## Registration
`check_voucher_eligibility` (no-mutate), `register_for_voucher` (atomic + advisory lock), `cancel_my_voucher_registration`.

## RLS
Vouchers/relation tables: read cho `is_active_user`, deny direct write. Voucher registrations chỉ tạo qua RPC (policy `registrations_insert` chặn `registration_type='voucher'`).

## Non-goals 6B
Redemption/check-in, payment, OTP, storage upload, anonymous registration, generic rules engine, Rich Text Editor, mobile Supabase cutover, Events/Site Tour Admin, general registrations admin.