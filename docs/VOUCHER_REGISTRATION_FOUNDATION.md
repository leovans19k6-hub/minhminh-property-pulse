# Voucher Registration Foundation (Phase 6B)

## RPCs
- `register_for_voucher(voucher_id, product_id?, product_type_id?, policy_id?, note?)` → `{ registration_id, registration_code, status, voucher_id, remaining }`.
- `cancel_my_voucher_registration(registration_id)` — owner-only; chỉ khi `status IN (new, in_progress)`.
- `get_my_voucher_registrations(project_id?, status?)` — chỉ rows của mình.

## Lead integration
- Có `phone` trong profile → normalize; tìm lead khớp `normalized_phone` → reuse.
- Không có → tạo lead mới: `source_id = lead_sources.code = 'app'`, `interested_project_id`, `interested_product_id`, `created_by = auth.uid()`, `status='new'`, `priority='normal'`.
- Registration liên kết `lead_id`.

## Status semantics
- `new/in_progress/confirmed/completed` → count capacity.
- `cancelled/no_show` → không count.
- Voucher registration khởi tạo `status='new'`. Admin workflow chi tiết ở Phase 6D.

## Non-goals 6B
Không xây registrations Admin workflow, không auto-notify, không SMS/OTP, không anonymous registration.