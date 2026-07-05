# Mobile Policies Query

`search_mobile_policies(p_project_id, p_query, p_featured, p_limit, p_offset) → jsonb[]`

- Cross-project when `p_project_id IS NULL` (uses `accessible_mobile_project_ids()`).
- Project-scoped otherwise, gated by `can_access_mobile_project`.
- `p_query` ILIKE `%q%` matched on `title` or `summary`.
- Limit clamped `[1..100]` (default 30), offset `>= 0`.
- Only currently effective / published / active / non-archived policies.
- Order: `is_featured DESC, priority DESC, published_at DESC NULLS LAST, updated_at DESC, id ASC`.

Row shape:
```
{ id, project_id, project_name, project_code, title, slug, summary,
  is_featured, priority, effective_from, effective_to, registration_deadline, published_at }
```

Client hook: `useMobilePolicies({ projectId, query, featured })` — infinite (page 30).
