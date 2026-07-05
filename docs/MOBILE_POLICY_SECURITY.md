# Mobile Policy Security — Phase 7C.1

All new RPCs: `SECURITY DEFINER`, `SET search_path = public`, `REVOKE ALL FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated, service_role`. All require `auth.uid()` and `is_active_user()`.

- `search_mobile_policies` — restricts to `accessible_mobile_project_ids()` when project id is null; otherwise calls `can_access_mobile_project` and rejects with `permission_denied`.
- `get_mobile_policy_detail` — distinct errors: `policy_not_found`, `policy_not_available`, `policy_not_effective`, `permission_denied`, `product_not_found`, `product_project_mismatch`, `policy_not_applicable`.
- `get_mobile_project_detail` — inherits existing project gate; preview omits content/attachments/applicability.

Admin RPCs never called from mobile.
