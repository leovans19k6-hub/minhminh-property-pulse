# Event Lifecycle (Phase 6C)

## Stored status transitions

```
draft ──publish──► active ──pause──► paused ──resume──► active
                     │                                    │
                     ├──── complete (end_at <= now) ──────┤──► completed
                     ├──── cancel ────────────────────────┼──► cancelled
                     └──── archive ───────────────────────┴──► archived ──restore──► draft
```

`restore_event` always clears `published_at` and returns the event to `draft` — no auto-publish.

## Derived state

`event_derived_state` reads stored fields and the live capacity-count and returns one of:
`draft`, `upcoming_registration`, `registration_open`, `upcoming`, `ongoing`, `full`, `registration_closed`, `completed`, `cancelled`, `paused`, `archived`.

## Business rules

- **DRAFT**: editable; hidden from mobile active queries.
- **ACTIVE**: registration window enforced by `registration_start`/`registration_deadline` when present.
- **PAUSED**: no new registrations; existing preserved.
- **CANCELLED**: no new registrations; existing preserved; no auto-notification.
- **COMPLETED**: `complete_event` only when `end_at <= now()`; no manual early-complete API in Phase 6C.
- **ARCHIVED**: hidden from mobile; no physical delete.

## Publish invariants

`publish_event` requires: `start_at` and `end_at` set, `end_at >= now()`, capacity ≥ current registration count, valid location + site-tour details.