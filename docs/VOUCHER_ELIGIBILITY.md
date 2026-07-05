# Voucher Eligibility (Phase 6B)

## RPC
`check_voucher_eligibility(voucher_id, product_id?, product_type_id?, policy_id?)` → JSON.

## Response
```json
{
  "eligible": bool,
  "code": "ok|voucher_not_found|voucher_archived|voucher_not_active|voucher_paused|voucher_expired|voucher_registration_not_open|voucher_registration_closed|voucher_full|voucher_user_limit_reached|voucher_not_applicable|voucher_profile_incomplete|permission_denied",
  "message": "vi",
  "derived_state": "…",
  "capacity": int|null, "registration_count": int, "remaining": int|null, "user_registration_count": int
}
```

## Rules
1. Authenticated + `is_active_user()`.
2. Voucher exists.
3. Derived state ∉ `{archived, draft, paused, expired, upcoming_registration, registration_closed, full}`.
4. `user_registration_count < per_user_limit`.
5. Product (nếu truyền) thuộc dự án voucher; product_type resolve từ product khi cần.
6. Applicability: `project_wide` luôn match; ngược lại phải khớp ít nhất một trong ptIds/productIds/policyIds; nếu voucher không có relation nào → fallback match.
7. Profile phải có `full_name` và `phone`.

## Non-goals 6B
Không xây generic rules engine; conditions_json hiển thị business-readable, không tự động enforce.