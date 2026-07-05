# Event Capacity & Concurrency (Phase 6C)

## Capacity source of truth

`_event_registration_count(event_id)` counts `registrations` with `event_id = $1`, `registration_type IN ('event','site_tour')`, and `status IN ('new','in_progress','confirmed','completed')`. Cancelled and `no_show` do NOT count.

`events.registered_count` is a cached hint updated by `register_for_event`; readers should not trust it. All authoritative checks use `_event_registration_count` inside the RPC.

## Overbooking protection

`register_for_event` serializes concurrent callers via:

```sql
PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text, 43));
SELECT * INTO v FROM public.events WHERE id = p_event_id FOR UPDATE;
```

Seed `43` is intentionally different from the Voucher lock seed `42` (`register_for_voucher`) to avoid unnecessary cross-engine contention on the same id.

After acquiring the lock the RPC re-fetches the event, re-runs eligibility, re-counts capacity, re-checks per-user limit, resolves the lead, inserts the registration, updates the cached count, and audits — all inside the same transaction.

## Per-user limit

`per_user_limit` is enforced by counting the caller's existing capacity-counting registrations under the lock. When `per_user_limit = 1` a duplicate registration attempt raises `duplicate_event_registration`.

## Capacity update guard

`update_event` refuses to set `capacity` below `_event_registration_count` (`capacity_below_registration_count`). `publish_event` and `resume_event` re-check this.