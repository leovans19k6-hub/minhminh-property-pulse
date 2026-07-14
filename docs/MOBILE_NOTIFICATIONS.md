# Mobile Notifications (Phase 7C.5)

Mobile Notifications cutover for the sales-hub client. No new RPCs — the
existing `public.notifications` table with owner-scoped RLS already exposes
the correct contract to `authenticated`; the mobile surface simply consumes
it through the standard Data API + typed service wrappers.

## Data contract

Table: `public.notifications`.

Columns used by the mobile client:

- `id uuid` — deterministic key + tie-breaker for ordering.
- `user_id uuid` — recipient. RLS enforces `user_id = auth.uid()` on every
  read/update.
- `notification_type text` — used to pick the icon (voucher / event /
  registration / project / policy / fallback).
- `title text` (required) + `message text` (optional) — rendered as-is;
  raw `metadata jsonb` is never surfaced to the UI, avoiding accidental
  PII exposure.
- `entity_type text`, `entity_id uuid` — informational; not read by the UI
  today.
- `action_url text` — passed through a strict same-origin whitelist before
  becoming a `<Link>` target.
- `read_at timestamptz` — nullable; null means unread.
- `created_at timestamptz` — primary sort key.

## Access & authorization

Existing RLS (unchanged in Phase 7C.5):

- `notifications_read_own` — `SELECT`: `is_active_user() AND user_id = auth.uid()`.
- `notifications_update_own` — `UPDATE`: `is_active_user() AND user_id = auth.uid()`
  in both `USING` and `WITH CHECK`; the mobile client only ever writes `read_at`.
- `notifications_insert_admin` — `INSERT` restricted to super_admin / admin /
  director; mobile clients cannot fabricate notifications.

Grants are the default `authenticated` CRUD (already present); anon is not
granted `EXECUTE`/write on user-owned rows because every policy checks
`auth.uid()`.

No `SECURITY DEFINER` RPC is introduced; per project convention we prefer
direct RLS-scoped Data API access for simple owner-scoped tables (mirrors
the Favorites pattern in Phase 7B).

## Client surface

Service: `src/services/notifications.service.ts` exposes
`listNotifications(userId, limit, offset, unreadOnly)`, `getUnreadCount`,
`markRead`, `markAllRead`. All service functions accept an explicit
`userId` to keep the caller responsible for auth binding — RLS still
enforces ownership.

Queries: `src/features/notifications/queries.ts` — React Query hooks
`useMobileNotifications`, `useUnreadNotificationCount`,
`useMarkNotificationRead`, `useMarkAllNotificationsRead`. Cache
invalidation is narrow: mutations invalidate the notifications list key
for the current user plus the unread-count key. No global cache reset.

## Ordering & pagination

Server-side deterministic ordering: `created_at DESC, id DESC`. Pagination
uses `.range(offset, offset + limit)` — one extra row is requested to
compute `hasMore` without a second round-trip. Page size = 30.

## Filters

`unreadOnly` toggle. When true, the query adds
`.is("read_at", null)` before ordering/range. The unread-count query
remains independent and is used both for the "N chưa đọc" summary and the
bottom count in the tab label.

## Header + account badge

`MobileHeader` and the `/account` shortcut each subscribe to
`useUnreadNotificationCount` (30 s `staleTime`). The badge caps at "99+".
No polling loop; refresh happens on route navigation and after mutations
via React Query invalidation.

## Safe navigation

`action_url` values are filtered through `safeInternalHref` in
`NotificationItem`:

- Must start with `/` and must NOT contain `://` or start with `//`.
- Must match one of the allow-listed prefixes: `/inventory`, `/products/`,
  `/projects`, `/favorites`, `/notifications`, `/policies`, `/vouchers`,
  `/events`, `/registrations`, `/account`.

Anything else falls back to a non-navigating `<button>` that still marks
the item as read.

## Realtime

Not enabled. Cost/benefit is low — badge freshness is bounded by the
30 s `staleTime` plus explicit invalidation after `markRead` /
`markAllRead`, and admin-authored notifications are latency-tolerant.
If future needs demand real-time delivery, subscribe to
`postgres_changes` filtered by `user_id = auth.uid()` on the
`notifications` table and invalidate the two query keys.

## States

- Skeleton on first load (`NotificationsSkeleton`).
- `MobileQueryErrorState` on `list.isError`.
- Explicit empty block when there are zero rows on `offset === 0`.
- Inline loader shown during pagination (`list.isFetching`).

## Removed mock usage

Nothing to remove — the notifications feature was introduced already
Supabase-backed in Phase 7B.2D. This phase only hardens the surface
(unread filter, badge wiring, safe-nav allow-list expansion,
deterministic tie-break ordering, docs, smoke test).