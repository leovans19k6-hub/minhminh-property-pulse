# CRM Tasks (Phase 6D)

Table `public.crm_tasks`. Statuses: `open`, `in_progress`, `completed`, `cancelled`. No physical delete.

RPCs: `create_crm_task`, `update_crm_task`, `assign_crm_task`, `start_crm_task`, `complete_crm_task`, `cancel_crm_task`, `search_crm_tasks`.

Assignee validated via `is_valid_assignee`. Notification `task_assigned` emitted when assignee changes to a different user.