# Mobile Policy UI

## Components
- `MobilePolicyCard`, `PolicyIdentityCard`, `PolicyContentSections`, `PolicyApplicabilityCard`, `PolicyAttachmentsCard`

## Routes
- `/policies?projectId=&q=&featured=` (infinite, page 30, cap 100)
- `/policies/$policyId?productId=`

## Cache
- List & detail: `staleTime 45s`, no retry on permission/not-found/not-effective/not-applicable/not-available. No new realtime.

## Effective date formatting
neither → "Đang áp dụng"; from-only → "Từ {d}"; to-only → "Đến {d}"; both → "{start} – {end}". Registration deadline shown separately; passed deadline shows warning "Đã hết hạn đăng ký" without hiding policy.

## Mock
No mobile route/component imports `src/features/mock/data.ts` (verified via `rg -n features/mock src/routes src/components/mobile`).
