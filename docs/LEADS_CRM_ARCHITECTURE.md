# Leads CRM (Phase 6D)

Lead lifecycle: `new → contacted → qualified → nurturing → converted | lost → nurturing (reopen)`.

Conversion: `convert_lead(p_lead_id, p_reason)` — manager only.
Lost: `mark_lead_lost(p_lead_id, p_reason)` — reason required.
Reopen: `reopen_lead(p_lead_id, p_reason)` — clears lost metadata, moves to nurturing.

Assignment: `assign_lead` requires manager permission on the lead's project; assignee must be active + project-eligible.

Priority: `set_lead_priority(p_lead_id, p_priority)`.

Merge foundation: fields `merged_into_lead_id`, `merged_at`, `merged_by` reserved. Full merge RPC deferred to future phase.