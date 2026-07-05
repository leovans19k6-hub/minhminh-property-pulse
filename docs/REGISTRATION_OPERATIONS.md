# Registration Operations (Phase 6D)

Operations Engine layer over existing Voucher/Event registration RPCs.

- `assign_registration` — trusted RPC; validates assignee against `project_id`.
- `transition_registration_status` — trusted RPC; uses `can_transition_registration_status`. Does NOT bypass Voucher/Event domain semantics.
- `review_registration(decision)` — accept → `confirmed`, reject → `rejected`, request_more_info → `in_progress`. Appends `registration_reviews` row.

Bulk: `bulk_assign_registrations(ids[], user)` — atomic, max 100.