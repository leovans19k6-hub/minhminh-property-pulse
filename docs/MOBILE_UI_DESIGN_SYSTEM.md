# Mobile UI Design System — Minh Minh Sales Hub

Phase 7B.2 foundation for the mobile sales app of **Minh Minh Group Hải Phòng**.

## Direction

"Premium Real Estate Sales Operating App" — corporate, modern, information-dense but readable, Vietnamese-first, thumb-friendly.

No gradient walls. No glassmorphism. No SaaS template look. No admin-dashboard-in-a-phone.

## Brand

| Token | Value | Usage |
| --- | --- | --- |
| `--brand-navy` | `#0F2A52` (oklch 0.24 0.07 258) | Primary, headings, active nav, primary CTA |
| `--brand-navy-hover` | oklch 0.29 0.08 258 | Hover state |
| `--brand-navy-soft` | oklch 0.95 0.02 258 | Selected chip, active pill, subtle tint |
| `--brand-gold` | `#C8A96B` | Featured/premium accent only |
| `--brand-gold-soft` | oklch 0.95 0.04 82 | Voucher / featured badge background |

Gold is **never** used as a large background surface — only for premium accents (featured badge, divider, small icon).

## Surfaces & text

| Token | Purpose |
| --- | --- |
| `--app-background` | Full-viewport neutral (#F5F7FA-ish) |
| `--surface` | Card / sheet / header |
| `--surface-secondary` | Subtle inset |
| `--text-primary` | Body text |
| `--text-secondary` | Metadata |
| `--text-tertiary` | Labels, hints |

## Semantic

`--success`, `--warning`, `--danger`, `--info` and their `-soft` companions. Status badges consume these via `StatusBadge` tones (`success | warning | danger | info | neutral | premium`).

## Shadow / radius

`--shadow-xs`, `--shadow-sm`, `--shadow-md` — all navy-tinted, low intensity. Radius follows shadcn scale, cards default to `rounded-2xl`.

## Mobile layout tokens

```
--mobile-header-height:      56px
--mobile-bottom-nav-height:  68px
--mobile-content-max-width:  720px
--mobile-page-padding:       16px
--mobile-section-gap:        24px
```

## Typography

System stack — no new Google Font dependency in this phase. Hierarchy:

| Role | Size |
| --- | --- |
| Page title | 22–24px / semibold |
| Section title | 15–17px / semibold |
| Card title | 15px / semibold |
| Body | 14–15px |
| Metadata | 12–13px |
| Caption | 11px uppercase tracking-wide |
| Price | 18–24px / bold, navy |

## Rules

- No hardcoded Tailwind colors (`bg-emerald-100`, `text-slate-700`, hex `#...`) in components — always semantic tokens.
- Touch targets ≥ 44×44 px.
- Respect `env(safe-area-inset-top / bottom)`.
- Bottom nav + sticky action bar never overlap content.
- `prefers-reduced-motion` respected — transitions are ≤ 200ms.

## Scope shipped in 7B.2

- Refactored `src/styles.css` with the token map above.
- Refactored `StatusBadge`, `MobileShell` (tablet-friendly widths), `BottomNav` (soft-pill active state).
- New shared primitives: `PriceDisplay`, `InfoRow`, `SectionCard`, `StickyActionBar`, `FilterChip`.

## Deferred (documented, not shipped this turn)

Full route-by-route restructuring (Home, Projects, Project Detail, Inventory, Product Detail, Favorites, Account, Notifications, Register) will consume the new primitives progressively. Business logic, RPC contracts, RLS, service layer, favorites persistence, primary contact privacy, and realtime behaviour are unchanged.