# Sales Policy — Mobile-Ready Query

`get_active_project_policies(p_project_id uuid, p_product_id uuid = NULL, p_product_type_id uuid = NULL)` → `jsonb` array of policy rows.

## Visibility rules

A policy is included iff **all** of:

- `status = 'active'`
- `archived_at IS NULL`
- `published_at IS NOT NULL`
- `effective_from IS NULL OR effective_from <= now()`
- `effective_to IS NULL OR effective_to >= now()`
- Applicability matches **any** of:
  - project-wide (no rows in `policy_product_types` or `policy_products`)
  - `p_product_type_id` (or product's actual type when `p_product_id` given) exists in `policy_product_types`
  - `p_product_id` exists in `policy_products`

When `p_product_id` is provided the RPC **re-derives** `product_type_id` and `project_id` from the DB, ignoring any client-supplied `p_product_type_id` that would conflict. `invalid_policy_product` if the product does not belong to the project.

## Order

`is_featured DESC, priority DESC, effective_from DESC NULLS LAST, id ASC`.

## Auth

Requires `auth.uid()` + `is_active_user()`. Project-membership check delegated to existing SELECT policy on `sales_policies` (SECURITY DEFINER lets the RPC surface any authorized project's rows without leaking archived/draft state).

No Mobile UI ships in Phase 6A — this RPC is the foundation for the Mobile App cutover in a later phase.
