# Voucher Mobile Query (Phase 6B)

## RPCs
- `get_active_project_vouchers(project_id, product_id?, product_type_id?, policy_id?, limit, offset)` — list.
- `get_active_voucher_detail(voucher_id, product_id?, product_type_id?, policy_id?)` — detail + eligibility + my registrations.
- `get_my_voucher_registrations(project_id?, status?, limit, offset)`.

## Filter rules
- `status='active'` + `archived_at IS NULL` + `published_at IS NOT NULL`.
- Applicability: `project_wide` luôn hiển thị; ngược lại chỉ hiển thị nếu context match relation của voucher; nếu không context nào truyền → hiển thị tất cả voucher đủ điều kiện.

## Sort
`priority DESC, updated_at DESC, id ASC` — ổn định.

## List fields
`id, title, slug, code, summary, benefits, registration_deadline, valid_to, is_featured, priority, derived_state, capacity, registration_count, remaining, user_registration_count`.

## Detail fields
voucher (mobile-safe: không `created_by/updated_by/metadata`), `derived_state`, `capacity_stats`, `eligibility`, `my_registrations`, `project` summary.

## Not exposed
Không expose registrations của người khác, không expose PII lead.

## Cutover
Mobile UI vẫn dùng mock ở 6B. `src/services/vouchers.service.ts` đã có wrappers: `getActiveProjectVouchers`, `getActiveVoucherDetail`, `registerForVoucher`, `checkVoucherEligibility`, `cancelMyVoucherRegistration`, `getMyVoucherRegistrations` — sẵn sàng cho Mobile cutover.