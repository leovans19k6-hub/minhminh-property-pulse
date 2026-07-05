# Sales Policy — Versioning

## Table

```
sales_policy_versions (
  id uuid PK,
  policy_id uuid FK cascade,
  version_number int,
  snapshot jsonb,
  change_summary text,
  created_by uuid,
  created_at timestamptz,
  UNIQUE (policy_id, version_number)
)
```

Snapshot content:
`title, slug, summary, content_json, attachments, applicability_scope, priority, is_featured, status, effective_from, effective_to, published_at, archived_at, product_type_ids[], product_ids[]`.

## Immutability

RLS denies `INSERT/UPDATE/DELETE` for `authenticated`. Only the SECURITY DEFINER helper `create_sales_policy_version(p_policy_id, p_change_summary)` inserts rows — and it is `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`, so only other SECURITY DEFINER RPCs call it in-process.

Version rows are append-only. Not editable, not deletable except by service_role or cascade on policy delete.

## When versions are created

| Event | Version |
| --- | --- |
| `create_sales_policy` | 1 |
| `create_sales_policy` with `p_publish=true` | 1 (single version records both create + publish) |
| `update_sales_policy` with any effective change | +1 |
| `update_sales_policy` no-op (no content/applicability/dates/flags changed) | none |
| `publish_sales_policy` | +1 (skipped if already active) |
| `unpublish_sales_policy` | +1 (skipped if not active) |
| `clone_sales_policy` | new policy version 1 (source versions NOT copied) |
| `archive_sales_policy` | +1 |
| `restore_sales_policy` | +1 |

`sales_policies.version_number` mirrors the latest inserted version.

## History vs audit

- `audit_logs` — operational trace (`create_policy`, `publish_policy`, ...), keyed by `entity_id`.
- `sales_policy_versions` — business-readable snapshots for restore/diff/UI.

Phase 6A UI shows version history + snapshot dialog; **restoring an old version is BACKLOG**.
