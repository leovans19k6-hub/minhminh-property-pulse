# CRM Activity Timeline (Phase 6D)

Table `public.crm_activities`. User-visible types: `note`, `call`, `meeting`, `follow_up`, `other`. System types (`status_change`, `assignment`, `registration_review`, `system`) written only by trusted RPCs. Read scope: project managers, system directors, and assignee/creator of the linked lead/registration.

RPCs: `create_crm_activity`, `get_lead_timeline`, `get_registration_timeline`.