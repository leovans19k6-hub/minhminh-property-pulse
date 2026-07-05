# Operations Bulk Atomicity (Phase 6D.1)

`bulk_assign_leads` and `bulk_assign_registrations` share one contract.

## Preconditions

- Non-null, non-empty input; ≤ 100 unique IDs (duplicates deduped server-side).
- Every requested row exists (`count(*) = requested_count`) else `lead_not_found` / `registration_not_found`.
- Caller `_ops_can_manage_project` for every actual project.
- Assignee `is_valid_assignee` for every actual project.

Any failure raises inside the transaction ⇒ nothing is written (no assignment update, no activity, no notification, no audit).

## No-op handling

Rows whose current `assigned_to` equals the requested value are counted as `unchanged` and skipped — no duplicate activity, no duplicate notification. When `changed_count = 0`, no bulk audit summary row is written.

## Return contract

```
{
  "requested_count": int,
  "changed_count":   int,
  "unchanged_count": int,
  "affected_ids":    uuid[]
}
```

Same shape for both RPCs. Clients must not infer counts.
