# Mobile Product Detail UI (Phase 7B.2A)

Route: `src/routes/products.$productId.tsx` — orchestrates data (`useMobileProductDetail`), realtime, favorite mutations, and share; delegates all presentation to the components below. Data contract, RPC, favorite mutation strategy, and realtime subscriptions from Phase 7B / 7B.1 are unchanged.

## Information architecture

In order, and each section renders only when it has real data:

1. Media Gallery — `ProductMediaGallery`
2. Identity Card — `ProductIdentityCard` (product code, name, project/type/zone/building, status badge, favorite)
3. Primary Price (navy hero block; `Chưa cập nhật giá bán` fallback when null)
4. Key Specifications — `ProductSpecsCard` (adaptive apartment vs low-rise)
5. Other Price Options — `ProductPriceOptions`
6. Description — `SectionCard` only if `product.description` present
7. Custom Field Groups — `ProductCustomFields`
8. Price History Summary — `ProductPriceHistoryCard` (only when `can_view && has_history`)
9. Status History Summary — `ProductStatusHistoryCard` (only when `can_view && change_count>0`)
10. Applicable Policies — `PoliciesPreview`
11. Applicable Vouchers — `VouchersPreview`
12. Upcoming Events — `EventsPreview`
13. Primary Contact — `PrimaryContactCard`
14. Sticky Action Bar — favorite, copy phone, `Gọi tư vấn`

## Components

| Component | Responsibility |
| --- | --- |
| `product-detail/ProductMediaGallery` | Hero 4:3 image, thumbnail strip, image counter, full-screen lightbox with keyboard nav (Esc / ← →), broken-image fallback. No video autoplay. |
| `product-detail/ProductIdentityCard` | Product code + name, project + type + zone + building context, semantic status badge, favorite toggle (44×44, `aria-pressed`, disabled while pending). |
| `product-detail/ProductSpecsCard` | 2-column adaptive spec grid; apartment vs low-rise field sets; renders nothing when no fields have values. |
| `product-detail/ProductPriceOptions` | Non-primary price options as compact rows; hidden when list empty. |
| `product-detail/ProductCustomFields` | Groups fields by `field_group`; renders per `data_type` (long_text, boolean chip, url, phone, date, datetime, multi-select chips). Skips empty values. Never shows `field_key`. |
| `product-detail/ProductHistorySummary` | `ProductPriceHistoryCard` (previous / current / trend / %; increase = danger tone) and `ProductStatusHistoryCard` (previous → current badges + change count). Both privacy-gated via `can_view`. |
| `product-detail/ProductPreviewSections` | `PoliciesPreview`, `VouchersPreview`, `EventsPreview` — non-clickable previews; no fake CTA. |
| `product-detail/ProductStatusBadge` | Semantic tone map for product `status` (available/reserved/booked/sold/locked/unavailable). |
| `product-detail/ProductDetailSkeleton` | Layout-matching skeleton (hero + identity + price + specs + section cards). |
| `PrimaryContactCard` | Reusable primary contact card. Actions render only when `phone` / `zalo_url` exist. Call = `tel:`, Copy = clipboard + Vietnamese toast, Zalo = real URL, `noreferrer noopener`. |

## Sticky action bar

`StickyActionBar` sits above the safe-area inset. Actions adapt to contact data:

- Always: Favorite (44×44, `aria-pressed`).
- When `primary_contact.phone`: Copy phone + `Gọi tư vấn` (`tel:`).
- When no phone: neutral `Chưa có phụ trách` chip (no disabled fake Call button).

`BottomNav` is hidden on this route (`showBottomNav={false}`) so the sticky action bar is the only bottom-anchored layer; `bottomPadding={72}` reserves space so content never sits under it.

## Realtime and favorites

Preserved from Phase 7B.1: product-scoped channel with 700 ms debounced invalidation on `products`, `product_price_options`, `product_custom_values`, `product_media`. Favorite mutations use existing `useAddMobileFavorite` / `useRemoveMobileFavorite` (no optimistic state, no localStorage).

## Responsive rules

- Layout uses `min-w-0` + `truncate` / `break-words` on identity, price rows, and contact meta to survive 360 px.
- Media aspect ratio is stable 4:3; thumbnails 64×64 in horizontal scroll.
- Specs auto-collapses to 1 column when only one item is present.
- Sticky action bar fits 360 px (favorite + copy + label + Call button).

## Known limitations

- Policies / Vouchers / Events previews are non-clickable (mobile detail routes not built yet).
- No offline caching, no push, no analytics, no Zalo API integration.
- Manual regression across viewport sizes and data variants was NOT executed in this turn.