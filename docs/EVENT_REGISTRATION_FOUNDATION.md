# Event Registration Foundation (Phase 6C)

## Canonical type strategy

`registration_type` remains a text column with CHECK values `consultation | voucher | site_tour | event`. Event Engine writes:

- `event_type = 'site_tour'` → registration inserted with `registration_type = 'site_tour'` (preserves existing mobile UI compatibility).
- Any other `event_type` → registration inserted with `registration_type = 'event'`.

The subtype (sales_event, training, opening, customer_event) is always readable from the joined `events.event_type` — no new registration_type values are introduced.

## Lead integration

`register_for_event` reuses the Voucher pattern:

1. Fetch `profiles(id = auth.uid())`.
2. Require `full_name` and `phone` non-empty (else `event_profile_incomplete`).
3. `normalize_phone(profile.phone)` → look up the most-recent lead by `normalized_phone`.
4. Reuse if found; otherwise `INSERT INTO leads` with `source_id = lead_sources.code='app'`, `interested_project_id = event.project_id`, `interested_product_id = context product (nullable)`, `status = 'new'`.
5. Link `registrations.lead_id`.

## Cancellation

`cancel_my_event_registration` requires: caller owns the registration, `registration_type IN ('event','site_tour')`, status `new`/`in_progress`, event not `completed`/`archived`, and event has not started (`start_at > now()` or NULL). Otherwise `registration_not_cancellable`. Cancellation flips status to `cancelled`; capacity is immediately available on the next count.

## Direct-insert blocking

`registrations_insert` policy: `registration_type NOT IN ('voucher','event','site_tour')`. There is no other path for Event/Voucher registrations to reach the table.

## Canonical Event Registration Domain (Phase 6C.1)

SQL predicate: `public.is_event_registration_type(text)` — returns true for `event` and `site_tour`. All Event Engine reads that need to select "event-domain" registrations MUST use this predicate instead of duplicating `WHERE registration_type IN ('event','site_tour')`.

TypeScript mirror: `src/lib/registrationDomain.ts`
- `EVENT_REGISTRATION_TYPES` — `['event','site_tour']`
- `isEventRegistrationType(t)` — narrows to `EventRegistrationType`
- `getCanonicalRegistrationDomain(t)` — `'event' | 'voucher' | 'consultation' | null`
- `CAPACITY_COUNTING_STATUSES` — `['new','in_progress','confirmed','completed']`
- `CANCELLABLE_STATUSES` — `['new','in_progress']`
- `TERMINAL_STATUSES` — `['completed','cancelled','no_show','rejected']`

### Site Tour compatibility strategy

`site_tour` remains a distinct `registration_type` value to preserve existing mobile UI, notification templates, and analytics filters. The Event Engine treats both values as one domain via the predicate above; consumers that need to split them (mobile "Đăng ký tham quan" screen vs generic event registration) branch on `event_type` OR the raw `registration_type`, not on ad-hoc equality checks.

### Future canonicalisation

If Phase 6D+ decides to fold `site_tour` into `event`, the migration is:
1. Additive: introduce a normalized `registration_domain` generated column (`CASE WHEN registration_type IN ('event','site_tour') THEN 'event' ...`), backfill views, cut readers over.
2. Only after all readers use `is_event_registration_type` or `registration_domain`, drop `site_tour` from the CHECK constraint and update historical rows.

Phase 6C.1 does NOT perform destructive migration.

## Shared trusted lead helper (Phase 6C.1)

`public.get_or_create_registration_lead(p_user_id, p_project_id, p_product_id)`:

- SECURITY DEFINER, `SET search_path = public`.
- REVOKED from PUBLIC / anon / authenticated. GRANTed only to `service_role`. Callable only from other SECURITY DEFINER trusted RPCs.
- Validates profile has non-empty `full_name` and `phone`; otherwise raises `profile_incomplete`.
- Normalizes phone via `public.normalize_phone`.
- Acquires `pg_advisory_xact_lock(hashtextextended(normalized_phone, 91))` to serialize concurrent lead-create attempts on the same phone.
- Deterministic canonical selection when multiple leads share `normalized_phone`: `ORDER BY created_at ASC, id ASC LIMIT 1`.
- Never overwrites existing lead fields; never reassigns ownership.

`register_for_event` and `register_for_voucher` both delegate to this helper and re-raise `profile_incomplete` as `event_profile_incomplete` / `voucher_profile_incomplete` respectively, preserving their original error contracts. Client-side error mappers do not need to change.