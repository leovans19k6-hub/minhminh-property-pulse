# Mobile UI Components

Shared building blocks for the Minh Minh Sales Hub mobile app.

## Layout

- `MobileShell` — full-viewport centered container. Widths: 100% mobile, 640px sm, 720px md. Handles bottom-nav + safe-area padding.
- `MobileHeader` — home header with brand mark, greeting, notifications, avatar.
- `PageHeader` — back button + title + optional actions for interior routes.
- `BottomNav` — 5-item persistent tab bar with soft-pill active indicator.

## Content primitives

- `SectionHeader` — inline section title with optional action link.
- `SectionCard` — surfaced card wrapper for grouped content. Props: `title`, `action`, `padded`.
- `InfoRow` — label/value row. `align="row"` (justified) or `align="stack"` (label above value).
- `PriceDisplay` — Vietnamese-locale price with `sm | md | lg` sizes, currency suffix, `Liên hệ` fallback.
- `FilterChip` — pill button with optional remove affordance for applied filters.
- `StickyActionBar` — bottom-anchored action bar, offset-aware of bottom nav and safe area.

## Cards

- `MobileProjectCard`, `MobileInventoryCard`, `ProductCard`, `ProjectCard` — unchanged in 7B.2; all inherit new tokens via CSS.
- `StatusBadge` — semantic tones (`success | warning | danger | info | neutral | premium`) mapped from Vietnamese status labels.

## States

`MobileStates` — `MobileListSkeleton`, `MobileQueryErrorState`, `MobileEmptyState`, `MobileInlineLoader`.

## Rules of use

- Prefer these primitives before rolling one-off markup in a route file.
- Do not hardcode brand colors — reach for `var(--brand-navy)` etc. through classes like `text-[color:var(--brand-navy)]`.
- Do not stack two sticky bars. If `StickyActionBar` is used on Product Detail, keep BottomNav but ensure `bottomPadding` in `MobileShell` reserves ≥ 72px.