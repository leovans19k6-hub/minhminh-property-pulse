# Mobile My Registrations (Phase 7C.4)

Unified `/registrations` + `/registrations/$registrationId` for the caller's own
registrations across CONSULTATION / VOUCHER / EVENT / SITE_TOUR.

## RPCs (new, additive — no canonical logic duplicated)

- `search_my_mobile_registrations(p_project_id, p_domain, p_registration_type, p_status, p_query, p_limit, p_offset)` → `{ rows: [...] }`. Filters strictly to `created_by = auth.uid()`. Text search covers registration_code, project name, voucher/event title, product code/name.
- `get_my_mobile_registration_detail(p_registration_id)` → detail JSON `{ registration, project, voucher, event, product, primary_contact, activities, capabilities }`.

Both are `SECURITY DEFINER SET search_path = public`, revoked from PUBLIC/anon, granted to `authenticated, service_role`. Self-authorize with `auth.uid() IS NOT NULL AND public.is_active_user()`; detail also enforces `created_by = auth.uid()`.

## Safety

- Only the caller's own rows are returned; other users' PII, notes or ops-only activity content are never exposed.
- `activities` is restricted to `activity_type IN ('status_change','system','registration_review')` and returns only `id / activity_type / title / occurred_at` (no `content`, no `metadata`, no `created_by`).
- No write RPCs. Cancellation goes through canonical `cancel_my_voucher_registration` / `cancel_my_event_registration`. Consultation and other domains cannot be cancelled from mobile.
- `capabilities.cancel_method` is `'voucher' | 'event' | null`; `can_cancel` matches domain gates (voucher status ∈ {new,in_progress}; event/site_tour also requires event not completed/cancelled/archived and start_at null or future).

## Client

- Service `src/services/mobile/registrations.service.ts` — typed wrappers, VN error map, runtime detail guard.
- Queries `src/features/registrations/queries.ts` — `useMyMobileRegistrations` (infinite), `useMyMobileRegistrationDetail`, `useCancelMyRegistration` (dispatches to canonical voucher/event cancel).
- Query keys: `queryKeys.mobileMyRegistrations`, `queryKeys.mobileMyRegistrationDetail`.
- Routes `/registrations` and `/registrations/$registrationId`; entry point on `/account` shortcuts.
- Cache invalidation on cancel: `['mobile','registrations']`, detail key, plus the source `['mobile','vouchers']` or `['mobile','events']` and `mobileProjectDetail` when relevant. No realtime subscription; consistent with Phase 7C.2/7C.3.