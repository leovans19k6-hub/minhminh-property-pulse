# Mobile Sales Policies — Architecture (Phase 7C.1)

## RPCs
- `search_mobile_policies(p_project_id, p_query, p_featured, p_limit, p_offset)` — cross-project or project-scoped feed. Server derives accessible projects via `accessible_mobile_project_ids()` when no project id.
- `get_mobile_policy_detail(p_policy_id, p_product_id)` — safe single policy detail. Re-validates visibility, project access, optional product context.
- `get_mobile_project_detail` — extended additively with `policies_preview` (up to 5 project-wide, currently effective).
- `get_active_project_policies` — unchanged; still feeds Product Detail preview.

## Visibility
`status = 'active'` AND `archived_at IS NULL` AND `published_at IS NOT NULL` AND effective window valid AND caller passes `can_access_mobile_project`. Product context (detail) additionally requires same-project product, `can_access_mobile_product`, and applicability match.

## Never exposed
Draft/unpublished/archived/upcoming/expired policies, `created_by`/`updated_by`, audit logs, version history, admin RPCs, raw `content`/`attachment_url` legacy columns.

## Surfaces
- `/policies` list (cross-project or `?projectId=`)
- `/policies/$policyId?productId=` detail
- Project Detail: `Chính sách đang áp dụng` preview
- Product Detail: existing preview → clickable → detail with productId context

Home does not add a policy section in this phase.
