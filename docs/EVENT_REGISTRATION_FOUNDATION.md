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