# Mobile Realtime Inventory (Phase 7A)

`/inventory` subscribes to `postgres_changes` on `products` **only when a `projectId` is selected**, using `subscribeToInventory({ table: 'products', filter: 'project_id=eq.<uuid>' })`.

Behavior:
- One channel per project selection; teardown on unmount / project change.
- Debounced invalidation (700 ms) via `queryClient.invalidateQueries({ queryKey: ['mobile','inventory'] })` and the current project detail key.
- No per-card subscriptions.
- No cross-project subscription in Phase 7A. Rationale: current publication RLS is verified for `products` but broad multi-project mobile subscription would require an authorization-aware relay we do not have yet. Documented as a follow-up.

Realtime events are still filtered by RLS on `products` (`is_active_user()` — a signed-in employee sees only the rows RLS permits, matching what mobile list already renders).