# Sales Policies — Architecture (Phase 6A)

## Domain

`sales_policies` extended (additive) with:
- `content_json jsonb` — canonical structured content `{ sections: [{ id, title, subtitle?, content, note?, highlight?, items?, display_order }] }`. Max 50 sections. Section id unique per policy.
- `attachments jsonb` — array of external links `{ id, label, url, type }`, `type ∈ {pdf,image,document,spreadsheet,link}`. Max 20.
- `applicability_scope text` — derived label `project_wide | product_types | specific_products` (mixed = whichever includes products, else types).
- `priority integer` — display order (higher first).
- `version_number integer` — monotonic; incremented by `create_sales_policy_version`.
- `published_at timestamptz`, `created_by uuid`, `updated_by uuid`.

`sales_policy_versions` — immutable snapshot table (see `SALES_POLICY_VERSIONING.md`).

## Status lifecycle

`draft → active → (draft via unpublish) | archived`.

`expired` is derived at query time (`effective_to < now()`), not stored — no cron needed. Admin search / detail RPCs expose `derived_effective_status ∈ {draft, upcoming, effective, expired, archived}`.

## Applicability

Three scopes, mixed allowed:
- **project_wide** — no rows in `policy_product_types` or `policy_products`.
- **product_types** — one+ rows in `policy_product_types`.
- **specific_products** — one+ rows in `policy_products`.

Cross-project references rejected by DB triggers (`guard_policy_product_type_project`, `guard_policy_product_project`) — never trust client.

## Mutation surface

All writes go through SECURITY DEFINER RPCs. Direct `INSERT/UPDATE/DELETE` on `sales_policies`, `policy_product_types`, `policy_products` is denied by RLS.

| RPC | Purpose |
| --- | --- |
| `create_sales_policy(p_project_id, p_policy, p_product_type_ids, p_product_ids, p_publish)` | Atomic create; `p_publish=true` = validated publish in same txn (version 1) |
| `update_sales_policy(p_policy_id, p_patch, p_pts?, p_ps?, p_change_summary?)` | Allow-list patch; NULL arrays = keep. No-op = no new version. |
| `publish_sales_policy` | Validates content/dates; sets status=active, published_at=now. |
| `unpublish_sales_policy` | Sets status=draft, published_at=NULL. Idempotent. |
| `clone_sales_policy(p_policy_id, p_new_slug, p_new_title?)` | New draft, version 1; copies content/attachments/applicability/dates. NOT versions/audit/published state. |
| `archive_sales_policy(p_policy_id, p_reason?)` | Atomic unpublish + archive. |
| `restore_sales_policy` | Only from archived. Restores to draft (no auto-publish). |
| `get_sales_policy_admin_detail(p_policy_id)` | policy + project_types + products + versions summary + derived state + permissions. |
| `search_sales_policies(project, query?, status?, effective_state?, featured?, limit, offset)` | Paginated list; archived excluded unless `status='archived'`. Deterministic order: priority DESC, updated_at DESC, id ASC. |
| `get_active_project_policies(project, product_id?, product_type_id?)` | Mobile-ready. Only active + within effective window; product-wide OR type match OR product match. Resolves actual product type from DB when `product_id` given. |

## Query keys

See `src/lib/queryKeys.ts`:
- `adminSalesPolicies(projectId, filters)`
- `adminSalesPolicyDetail(policyId)`
- `adminSalesPolicyVersions(policyId)`
- `activeProjectPolicies(projectId, productId?, productTypeId?)`

## UI surface

- **`PoliciesTab`** — search + filters + table + create.
- **`PolicyFormDialog`** — create/edit; embeds Content Builder, Applicability Builder, Attachments Editor. "Save Draft" and "Save & Publish" (atomic via `p_publish=true`).
- **Policy Detail route** — `/admin/projects/$projectId/policies/$policyId` with sections + version history + snapshot dialog + clone/archive actions.
- **Dialogs** — `PolicyCloneDialog`, `PolicyArchiveDialog`, `PolicyVersionSnapshotDialog`.
