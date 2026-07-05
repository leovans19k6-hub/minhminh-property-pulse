# Mobile Product Security (Phase 7B / 7B.1)

## Authorization chain

`get_mobile_product_detail(p_product_id uuid) → jsonb` — `SECURITY DEFINER`, `search_path=public`, owned by `postgres`. Grants: `EXECUTE` to `authenticated`, `service_role`. `anon` denied.

1. Require `auth.uid()` and `is_active_user()` — otherwise raise `permission_denied` (42501).
2. Load `products` row by id; raise `product_not_found` (P0002) when missing OR `archived_at IS NOT NULL`.
3. Derive `project_id` server-side from that row; call `can_access_mobile_project(v_product.project_id)`.
4. Only after project access passes: load related project / developer / zone / building / floor / product_type by ids taken from the product row (never from the client).
5. Aggregate media, active prices, mobile-visible custom fields, and (privileged only) history summaries.
6. Delegate policy / voucher / event previews to the canonical RPCs (`get_active_project_policies`, `get_active_project_vouchers`, `get_active_project_events`) with the server-derived project + product context. Preview lists are capped at 5.

`p_product_id` is the only client input. No relation, table, or role identifier is caller-controlled; there is no dynamic SQL.

## Nested canonical RPC semantics

`SECURITY DEFINER` does not rebind `auth.uid()` — inside the nested call the JWT claims still identify the caller, so `is_active_user()` and any `auth.uid()` checks inside `get_active_project_policies` / `_vouchers` / `_events` still act as the mobile caller. Every nested RPC is granted only to `authenticated` + `service_role`; `anon` is denied. `get_mobile_product_detail` wraps each nested call in `BEGIN … EXCEPTION WHEN OTHERS THEN … := '[]' END` so a downstream failure degrades the preview array to `[]` and never surfaces raw error text on the client.

## Internal helper isolation

`_resolve_mobile_primary_contact(uuid) → jsonb` — `SECURITY DEFINER`, `SQL`, `STABLE`. `EXECUTE` granted only to `service_role`; `anon` and `authenticated` are denied. Callable only via other `SECURITY DEFINER` RPCs owned by `postgres` (owner-check bypasses caller privilege).

Returned columns are an explicit whitelist: `user_id`, `full_name`, `phone`, `avatar_url`, `position`, `branch`, `department`, `zalo_url` (project member override URL), `member_role`. Never returned: `email`, `employee_code`, system roles, profile metadata, MFA state.

## History visibility

`v_can_view_hist = has_any_role({'super_admin','admin','director'}) OR is_project_manager(project_id)`. Ordinary sales users receive `{"can_view": false}` with no other fields for both `price_history_summary` and `status_history_summary`.

## Realtime authorization

Realtime rows are still gated by RLS as the subscribed user. Product Detail subscribes only to product-scoped tables (`products`, `product_price_options`, `product_custom_values`, `product_media`); events only fire when the row is visible to the caller under existing RLS policies. See `MOBILE_PRODUCT_REALTIME.md`.

## Favorites

- `add_mobile_favorite(uuid)`: requires auth + active user + `can_access_mobile_product`; `INSERT … ON CONFLICT (user_id, product_id) DO NOTHING` — idempotent, safe under concurrent taps.
- `remove_mobile_favorite(uuid)`: `DELETE … WHERE user_id = auth.uid()`; never touches another user's row, so does not reveal whether another user favorited the product.
- `get_mobile_favorites(limit, offset)`: joins `favorites` to `inventory_product_summary`, filters by `auth.uid()` AND `project_id = ANY(accessible_mobile_project_ids())` AND non-archived product. `limit` clamped to `[1, 100]`, `offset` clamped to `[0, ∞)`. Deterministic order: `favorited_at DESC, product_code ASC, product_id ASC`.

No client `user_id` parameter is accepted by any favorites RPC.

## Primary Contact CTA

`primary_contact.phone` may be null; the tel: CTA is hidden when null (no fabricated fallback number). `zalo_url` is a project-member-configured URL stored server-side — surfaced as an `<a href>` only when present. No client-side deep link is synthesized.