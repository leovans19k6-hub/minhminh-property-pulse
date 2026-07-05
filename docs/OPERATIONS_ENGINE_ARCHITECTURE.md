# Operations Engine (Phase 6D)

Two aggregate roots — **Lead** and **Registration** — governed by a shared operations layer.

## Responsibilities
- Ownership: `created_by`, `assigned_to`.
- Project scope: `leads.interested_project_id`, `registrations.project_id`.
- Status workflow (see `LEAD_STATUS_MODEL`, `REGISTRATION_STATUS_MODEL` in `src/lib/registrationDomain.ts` mirroring SQL helpers `can_transition_lead_status` / `can_transition_registration_status`).
- Priority.
- Activities (`crm_activities`), tasks (`crm_tasks`), reviews (`registration_reviews`).
- Audit via `write_audit_log` on every trusted mutation.

## Domain guardrails
Operations RPCs do NOT bypass Voucher/Event/Policy engines:
- Voucher capacity/cancellation semantics live in `register_for_voucher` / `cancel_my_voucher_registration`.
- Event capacity/cancellation semantics live in `register_for_event` / `cancel_my_event_registration`.
- `transition_registration_status` re-checks `can_transition_registration_status`, records `domain` in audit, but does not override domain-specific validators.

## Tables (Phase 6D)
- `public.crm_activities` — timeline entries. Read: project scope; write: SECURITY DEFINER only.
- `public.crm_tasks` — follow-up tasks. Read: assignee/creator/project manager; write: SECURITY DEFINER only.
- `public.registration_reviews` — append-only review log. Read: project scope; write: `review_registration` only.

## Trusted RPCs
See `docs/RPC_PRIVILEGE_MATRIX.md` for the full matrix. All Phase 6D user-facing RPCs are `SECURITY DEFINER SET search_path = public`; internal helpers (`_log_crm_activity`, `_task_access`) are revoked from `authenticated`.

## Team scope
Phase 6D scope = project-scoped. No team hierarchy. Salesperson: rows they created or are assigned. Project manager: entire project. System director/admin/super_admin: cross-project per existing `has_any_role` gates.