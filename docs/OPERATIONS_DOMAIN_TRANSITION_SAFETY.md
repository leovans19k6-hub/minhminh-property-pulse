# Operations Domain Transition Safety (Phase 6D.1)

`transition_registration_status` and `review_registration` are generic RPCs. They MUST NOT bypass the Voucher / Event domain engines.

Enforced by `validate_operations_registration_transition(registration_id, new_status, operation)`:

| Domain | Cancel via generic | Complete via generic | Confirm/Accept via generic |
| --- | --- | --- | --- |
| VOUCHER | ❌ `voucher_registration_use_domain_cancel` | ❌ `voucher_registration_completion_not_supported` | ✅ only if voucher not archived |
| EVENT (incl. `site_tour`) | ❌ `event_registration_use_domain_cancel` | ❌ `event_registration_completion_not_supported` | ✅ only if event not archived / cancelled / completed |
| CONSULTATION / OTHER | ✅ per generic workflow | ✅ per generic workflow | ✅ per generic workflow |

Voucher cancellation ⇒ `cancel_my_voucher_registration` (owner) or Voucher domain admin flow (backlog).  
Event cancellation ⇒ `cancel_my_event_registration` (owner) or Event domain admin flow (backlog).  
Completion for Voucher/Event registrations is blocked until dedicated Redemption / Attendance modules exist.

The Admin Registration Detail UI filters `allowed_transitions` and hides Cancel/Complete controls for VOUCHER/EVENT.
