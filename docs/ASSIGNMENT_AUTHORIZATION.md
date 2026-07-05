# Assignment Authorization Model (Phase 6D.1)

Canonical rules — used by every assignment RPC (`assign_lead`, `assign_registration`, `assign_crm_task`, `bulk_assign_leads`, `bulk_assign_registrations`) and by the search RPCs (`search_assignable_users`, `search_bulk_assignable_users`).

Two separate checks:

1. **Caller authorization** — `_ops_can_manage_project(target_project)`: active user AND (system role `super_admin`/`admin`/`director` OR `is_project_manager(project)`).
2. **Assignee eligibility** — `is_valid_assignee(user, project)`: assignee `profiles.status='active'` AND (system role `super_admin`/`admin`/`director` OR `project_members` row for that project).

Project derivation is always server-side:
- Lead → `leads.interested_project_id`.
- Registration → `registrations.project_id`.
- Task → project of the referenced lead/registration; if both are set they must share a project (enforced by `create_crm_task` invariants).

No client-provided project_id is trusted. No search RPC returns a user the mutation RPC would reject under unchanged state. Inactive users are never returned or accepted.
