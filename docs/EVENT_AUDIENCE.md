# Event Audience Model (Phase 6C)

Applicability is one of `project_wide`, `product_types`, `specific_products`, `sales_policies`, `vouchers`, `mixed`. The scope is computed server-side by `_apply_event_audience` from the four audience arrays:

- No relations → `project_wide`.
- Exactly one relation kind populated → that kind (`product_types`, `specific_products`, `sales_policies`, `vouchers`).
- Two or more populated → `mixed`.

All ids are validated to belong to the event's project (or to be a global `product_types` row) before insert. Cross-project references raise `invalid_event_{product_type|product|policy|voucher}` and roll back the RPC.

`check_event_eligibility` (and the mobile `get_active_project_events` query) matches when any populated audience relation includes the caller's context, or when the event has no relations at all (safety net for `project_wide`).