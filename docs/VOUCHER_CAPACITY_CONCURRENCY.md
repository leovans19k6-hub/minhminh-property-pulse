# Voucher Capacity Concurrency (Phase 6B)

## Source of truth
`COUNT(*) FROM registrations WHERE voucher_id=X AND registration_type='voucher' AND status IN ('new','in_progress','confirmed','completed')`.
`vouchers.registered_count` chỉ là cached hint, cập nhật trong transaction nhưng không phải authority.

## Serialize per voucher
`register_for_voucher`:
1. `pg_advisory_xact_lock(hashtextextended(voucher_id::text, 42))` — serialize per voucher.
2. `SELECT … FOR UPDATE`.
3. Re-run `check_voucher_eligibility`.
4. Re-count under lock → reject `voucher_full`.
5. Enforce `per_user_limit` under lock → reject `voucher_user_limit_reached`; per_user_limit=1 cũng reject `duplicate_voucher_registration`.
6. Insert registration → commit → lock released.

Không overbooking dưới tải song song vì advisory lock ép serialize per voucher.

## Capacity reduction guard
`update_voucher` reject `capacity_below_registration_count` nếu quantity mới < current count. `publish_voucher`/`resume_voucher` cũng validate.

## Không thuộc 6B
Waitlist, quota per lead source, quota per date range, dynamic capacity — future.