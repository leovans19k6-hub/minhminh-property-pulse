# Voucher Security (Phase 6B)

## Threats & mitigations
- Direct client mutation on `vouchers` / relation tables → **denied by RLS** (`vouchers_deny_write`, `*_no_write`).
- Direct insert voucher registrations bypassing capacity/eligibility → **denied**: `registrations_insert` policy filters `registration_type <> 'voucher'`. Voucher registrations chỉ đi qua `register_for_voucher` (SECURITY DEFINER).
- Overbooking dưới tải song song → `pg_advisory_xact_lock(hashtextextended(voucher_id, 42))` + `SELECT … FOR UPDATE` + re-check capacity trong transaction.
- Cross-project reference (product/policy/product_type sai dự án) → chặn ở `_apply_voucher_applicability`.
- Privilege escalation qua SECURITY DEFINER helpers → `_apply_voucher_applicability`, `_voucher_registration_count` `REVOKE ALL FROM PUBLIC, anon, authenticated`.
- Anonymous access → mọi voucher RPC `REVOKE ALL … FROM PUBLIC, anon`, GRANT `authenticated, service_role`.
- Audit forging → clients không INSERT audit_logs trực tiếp; RPC ghi.
- PII leakage → mobile queries chỉ trả voucher + tổng hợp; không expose lead/other-user data.

## Auth chain
`auth.uid()` → `is_active_user()` → `is_project_manager(project_id)` → business validation → mutation + audit.

## Linter
0028/0029 warnings on SECURITY DEFINER callable by authenticated = intentional per `RPC_PRIVILEGE_MATRIX.md`. RLS bypass RPC phải giữ SECURITY DEFINER với inline authorize.