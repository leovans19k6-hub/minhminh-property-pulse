# Registration Operations (Phase 6D)

Operations Engine layer over existing Voucher/Event registration RPCs.

- `assign_registration` — trusted RPC; validates assignee against `project_id`.
- `transition_registration_status` — trusted RPC; uses `can_transition_registration_status`. Does NOT bypass Voucher/Event domain semantics.
- `review_registration(decision)` — accept → `confirmed`, reject → `rejected`, request_more_info → `in_progress`. Appends `registration_reviews` row.

Bulk: `bulk_assign_registrations(ids[], user)` — atomic, max 100.

## Server-authoritative capabilities (Phase 6D.2)

`public.get_operations_registration_capabilities(p_registration_id uuid, p_caller_id uuid default auth.uid())` returns:

```
{
  domain, status,
  allowed_transitions: text[],
  allowed_review_decisions: ('accept'|'reject'|'request_more_info')[],
  can_review, can_assign, can_create_task, can_create_activity,
  can_use_generic_cancel, can_use_generic_complete,
  domain_restrictions: [{ code, message }]
}
```

- Authorization: caller must be authenticated + `profiles.status='active'` + pass `_ops_can_access_registration`. `anon` is revoked.
- Domain rules encoded server-side:
  - VOUCHER / EVENT: `can_use_generic_cancel=false`, `can_use_generic_complete=false`; `allowed_transitions` never includes `cancelled` or `completed`.
  - VOUCHER `confirmed` transition + `accept` review require voucher `archived_at IS NULL`; else emits `voucher_archived` restriction.
  - EVENT `confirmed` transition + `accept` review require event `archived_at IS NULL` AND `status NOT IN ('cancelled','completed')`; else emits `event_archived` / `event_cancelled` / `event_completed`.
  - Terminal registrations emit `registration_terminal`; non-reviewable emit `registration_not_reviewable`.
- `get_registration_admin_detail` embeds this object as `capabilities` and mirrors `allowed_transitions`, `can_review`, `domain_restrictions` at the top level for backward compat.
- Admin Registration Detail UI renders Cancel / Complete / Accept / Reject / Request-More-Info exclusively from `capabilities.*` — no client-side domain policy.