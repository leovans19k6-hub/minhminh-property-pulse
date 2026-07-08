# Mobile Events UI (Phase 7C.3)

## Routes

- `/events` — cross-project list, search, chips for `event_type` / featured / `derived_state`, infinite pagination (page size 30).
- `/events/$eventId` — detail page. Search params: `productId`, `productTypeId`, `policyId`, `voucherId` (Zod-validated) so eligibility and registration reflect the entry context.

## Detail composition

`src/components/mobile/events/`:
- `EventIdentityCard` — cover, title, project, type, featured badge, derived state.
- `EventEligibilityCard` — surfaces `check_event_eligibility` code with VN copy.
- `EventLocationCard` — location type, address, meeting URL.
- `EventCapacityCard` — capacity / registration_count / remaining / per-user limit.
- `EventSessionsCard`, `EventAgendaCard`, `EventSpeakersCard`, `EventAttachmentsCard` — structured content.
- `EventSiteTourCard` — rendered only when `event_type === 'site_tour'`.
- `EventApplicabilityCard` — summarizes audience scope and whether the current context matches.
- `EventMyRegistrationCard` — active registration state for the caller.
- `EventRegistrationDialog` / `EventCancelRegistrationDialog` — action dialogs wired to canonical RPC mutations.
- Sticky action bar shows one CTA: register, cancel, or a VN-mapped disabled label per eligibility code.

## Cross-domain entry points

- Project detail (`projects.$projectId`) renders `events_preview` (max 5) linking to `/events/$eventId`.
- Product detail (`products.$productId`) event preview links preserve `?productId=` when navigating to the detail page.

## Cache invalidation

Mutations (`useRegisterForEvent`, `useCancelMyEventRegistration`) invalidate:
- All mobile event list queries (`["mobile","events", …]`).
- The specific `mobileEventDetail(eventId, productId?, policyId?, voucherId?)` entry.
- The parent `mobileProjectDetail(projectId)` and any related `mobileProductDetail(productId)`.

No realtime channel is added for Events in this phase (list + detail rely on manual invalidation + `staleTime`).