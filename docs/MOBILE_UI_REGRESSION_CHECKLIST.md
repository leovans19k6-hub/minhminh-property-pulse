# Mobile UI Regression Checklist — Phase 7B.2

Presentation-only refactor. No data / RPC / RLS / service changes. Use this list before shipping any UI change touching mobile.

## Visual consistency

- [ ] Every route uses `MobileShell` with consistent page padding.
- [ ] No hardcoded Tailwind colors (`bg-emerald-*`, `text-slate-*`, hex) in components.
- [ ] Cards use `rounded-2xl border border-border bg-[color:var(--surface)]`.
- [ ] Status badges consume `StatusBadge` (no ad-hoc pills).
- [ ] Prices go through `PriceDisplay` with Vietnamese formatting.

## Layout

- [ ] No horizontal overflow at 360 / 375 / 390 / 412 / 430 / 640 / 768 px.
- [ ] Header + BottomNav respect `env(safe-area-inset-*)`.
- [ ] Sticky action bar does not overlap BottomNav.
- [ ] `MobileShell` centered up to 720px on tablet.

## Accessibility

- [ ] Touch targets ≥ 44×44 px.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Images have `alt`.
- [ ] Focus-visible retained on interactive elements.
- [ ] Status never conveyed by color alone.

## State coverage per route

For each of `/`, `/projects`, `/projects/$projectId`, `/inventory`, `/products/$productId`, `/favorites`, `/account`, `/notifications`, `/register`:

- [ ] Loading skeleton matches final layout dimensions.
- [ ] Error state with retry.
- [ ] Empty state with correct copy.
- [ ] Permission-denied and not-found distinguished from generic error.

## Non-regression

- [ ] Favorites persistence unchanged.
- [ ] Primary Contact privacy unchanged (Zalo only when real URL).
- [ ] Realtime channels for product detail unchanged.
- [ ] URL filter state on `/inventory` preserved.
- [ ] TypeScript `tsgo --noEmit` green.

## Manual regression status (7B.2 ship)

**NOT EXECUTED** — no authenticated preview run for this turn. Static contract & token cascade verified; runtime pixel review deferred to a follow-up pass.