import { supabase } from "@/integrations/supabase/client";
import { ServiceError } from "../_helpers";

// Error mapping — keeps raw code visible when unmapped.
const ERROR_MAP: Record<string, string> = {
  permission_denied: "Bạn không có quyền thao tác.",
  inactive_user: "Tài khoản chưa được kích hoạt.",
  lead_not_found: "Không tìm thấy lead.",
  registration_not_found: "Không tìm thấy đăng ký.",
  task_not_found: "Không tìm thấy công việc.",
  activity_not_found: "Không tìm thấy hoạt động.",
  invalid_lead_status: "Trạng thái lead không hợp lệ.",
  invalid_lead_transition: "Chuyển trạng thái lead không hợp lệ.",
  lead_already_converted: "Lead đã được chuyển đổi.",
  lead_not_lost: "Chỉ mở lại được lead ở trạng thái đã mất.",
  invalid_lead_priority: "Mức ưu tiên không hợp lệ.",
  invalid_assignee: "Người được phân công không hợp lệ.",
  assignee_inactive: "Người được phân công đã bị khóa.",
  assignee_not_project_member: "Người được phân công không thuộc dự án.",
  invalid_registration_status: "Trạng thái đăng ký không hợp lệ.",
  invalid_registration_transition: "Chuyển trạng thái đăng ký không hợp lệ.",
  registration_domain_restriction: "Không thay đổi được do ràng buộc miền nghiệp vụ.",
  registration_not_reviewable: "Đăng ký không ở trạng thái duyệt.",
  invalid_review_decision: "Quyết định duyệt không hợp lệ.",
  invalid_activity_type: "Loại hoạt động không hợp lệ.",
  invalid_activity_target: "Đối tượng hoạt động không hợp lệ.",
  invalid_task_status: "Trạng thái công việc không hợp lệ.",
  invalid_task_transition: "Chuyển trạng thái công việc không hợp lệ.",
  invalid_task_priority: "Mức ưu tiên công việc không hợp lệ.",
  invalid_task_target: "Đối tượng công việc không hợp lệ.",
  task_already_terminal: "Công việc đã ở trạng thái kết thúc.",
  too_many_bulk_rows: "Không quá 100 dòng cho thao tác hàng loạt.",
};

export function mapOpsError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const code = raw.replace(/^.*?:\s*/, "").split(/\s|,|$/)[0]?.trim() ?? "";
  return ERROR_MAP[code] ?? raw;
}

async function rpc<T>(fn: string, params: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(fn as never, params as never);
  if (res.error) throw new ServiceError(mapOpsError(res.error), res.error);
  return res.data as T;
}

// ---------- Dashboard / My Work ----------
export interface OperationsDashboard {
  leads_by_status: Record<string, number>;
  unassigned_leads: number;
  registrations_by_domain: Record<string, number>;
  registrations_by_status: Record<string, number>;
  unassigned_registrations: number;
  open_tasks: number;
  overdue_tasks: number;
  my_leads: number;
  my_registrations: number;
  my_open_tasks: number;
}
export const getOperationsDashboard = (projectId?: string | null) =>
  rpc<OperationsDashboard>("get_operations_dashboard", { p_project_id: projectId ?? null });

export interface MyOperationsWork {
  leads: Array<{ id: string; full_name: string; phone: string; status: string; priority: string; interested_project_id: string | null; updated_at: string }>;
  registrations: Array<{ id: string; registration_code: string; registration_type: string; status: string; project_id: string | null; created_at: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; due_at: string | null; lead_id: string | null; registration_id: string | null; project_id: string | null }>;
  overdue_tasks: number;
}
export const getMyOperationsWork = (projectId?: string | null, limit = 50) =>
  rpc<MyOperationsWork>("get_my_operations_work", { p_project_id: projectId ?? null, p_limit: limit });

// ---------- Leads ----------
export interface LeadListRow {
  id: string; full_name: string; phone: string; email: string | null;
  status: string; priority: string; assigned_to: string | null; created_by: string | null;
  interested_project_id: string | null; source_id: string | null;
  created_at: string; updated_at: string;
  registration_count: number; open_tasks: number; overdue_tasks: number;
}
export interface LeadSearchArgs {
  projectId?: string | null; query?: string | null; status?: string | null; priority?: string | null;
  sourceId?: string | null; assignedTo?: string | null; unassigned?: boolean | null;
  createdFrom?: string | null; createdTo?: string | null; limit?: number; offset?: number;
}
export const searchLeads = (a: LeadSearchArgs = {}) => rpc<LeadListRow[]>("search_leads", {
  p_project_id: a.projectId ?? null, p_query: a.query ?? null, p_status: a.status ?? null,
  p_priority: a.priority ?? null, p_source_id: a.sourceId ?? null, p_assigned_to: a.assignedTo ?? null,
  p_unassigned: a.unassigned ?? null, p_created_from: a.createdFrom ?? null, p_created_to: a.createdTo ?? null,
  p_limit: a.limit ?? 50, p_offset: a.offset ?? 0,
});

export interface LeadAdminDetail {
  lead: Record<string, unknown> & { id: string; full_name: string; status: string; priority: string; interested_project_id: string | null };
  registrations: Array<{ id: string; registration_code: string; registration_type: string; status: string; project_id: string | null; assigned_to: string | null; created_at: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; due_at: string | null; assigned_to: string | null }>;
  activities: Array<{ id: string; activity_type: string; title: string; content: string | null; occurred_at: string; created_by: string | null }>;
}
export const getLeadAdminDetail = (leadId: string) =>
  rpc<LeadAdminDetail>("get_lead_admin_detail", { p_lead_id: leadId });

export const updateLeadProfile = (leadId: string, patch: Partial<{ full_name: string; phone: string; email: string; source_id: string; interested_project_id: string; note: string }>) =>
  rpc<Record<string, unknown>>("update_lead_profile", {
    p_lead_id: leadId,
    p_full_name: patch.full_name ?? null, p_phone: patch.phone ?? null,
    p_email: patch.email ?? null, p_source_id: patch.source_id ?? null,
    p_interested_project_id: patch.interested_project_id ?? null, p_note: patch.note ?? null,
  });

export const assignLead = (leadId: string, assignedTo: string | null) =>
  rpc<Record<string, unknown>>("assign_lead", { p_lead_id: leadId, p_assigned_to: assignedTo });

export const setLeadPriority = (leadId: string, priority: string) =>
  rpc<Record<string, unknown>>("set_lead_priority", { p_lead_id: leadId, p_priority: priority });

export const transitionLeadStatus = (leadId: string, status: string, reason?: string | null) =>
  rpc<Record<string, unknown>>("transition_lead_status", { p_lead_id: leadId, p_status: status, p_reason: reason ?? null });

export const convertLead = (leadId: string, reason?: string | null) =>
  rpc<Record<string, unknown>>("convert_lead", { p_lead_id: leadId, p_reason: reason ?? null });

export const markLeadLost = (leadId: string, reason: string) =>
  rpc<Record<string, unknown>>("mark_lead_lost", { p_lead_id: leadId, p_reason: reason });

export const reopenLead = (leadId: string, reason?: string | null) =>
  rpc<Record<string, unknown>>("reopen_lead", { p_lead_id: leadId, p_reason: reason ?? null });

export const bulkAssignLeads = (leadIds: string[], assignedTo: string | null) =>
  rpc<{ affected: number }>("bulk_assign_leads", { p_lead_ids: leadIds, p_assigned_to: assignedTo });

// ---------- Registrations ----------
export interface RegistrationListRow {
  id: string; registration_code: string; registration_type: string; domain: string;
  status: string; project_id: string | null; lead_id: string | null;
  assigned_to: string | null; created_by: string | null; created_at: string; updated_at: string;
  lead_name: string | null; lead_phone: string | null;
}
export interface RegistrationSearchArgs {
  projectId?: string | null; query?: string | null; domain?: string | null;
  registrationType?: string | null; status?: string | null; assignedTo?: string | null;
  unassigned?: boolean | null; createdFrom?: string | null; createdTo?: string | null;
  limit?: number; offset?: number;
}
export const searchRegistrations = (a: RegistrationSearchArgs = {}) =>
  rpc<RegistrationListRow[]>("search_registrations", {
    p_project_id: a.projectId ?? null, p_query: a.query ?? null, p_domain: a.domain ?? null,
    p_registration_type: a.registrationType ?? null, p_status: a.status ?? null,
    p_assigned_to: a.assignedTo ?? null, p_unassigned: a.unassigned ?? null,
    p_created_from: a.createdFrom ?? null, p_created_to: a.createdTo ?? null,
    p_limit: a.limit ?? 50, p_offset: a.offset ?? 0,
  });

export interface RegistrationAdminDetail {
  registration: Record<string, unknown> & { id: string; registration_code: string; registration_type: string; status: string; project_id: string | null; lead_id: string | null; assigned_to: string | null };
  domain: string;
  lead: Record<string, unknown> & { id: string; full_name: string; phone: string } | null;
  reviews: Array<{ id: string; decision: string; note: string | null; reviewed_by: string | null; reviewed_at: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; due_at: string | null; assigned_to: string | null }>;
  activities: Array<{ id: string; activity_type: string; title: string; content: string | null; occurred_at: string; created_by: string | null }>;
  allowed_transitions: string[];
}
export const getRegistrationAdminDetail = (registrationId: string) =>
  rpc<RegistrationAdminDetail>("get_registration_admin_detail", { p_registration_id: registrationId });

export const assignRegistration = (registrationId: string, assignedTo: string | null) =>
  rpc<Record<string, unknown>>("assign_registration", { p_registration_id: registrationId, p_assigned_to: assignedTo });

export const transitionRegistrationStatus = (registrationId: string, status: string, reason?: string | null) =>
  rpc<Record<string, unknown>>("transition_registration_status", { p_registration_id: registrationId, p_status: status, p_reason: reason ?? null });

export const reviewRegistration = (registrationId: string, decision: "accept" | "reject" | "request_more_info", note?: string | null) =>
  rpc<{ review_id: string; status: string }>("review_registration", { p_registration_id: registrationId, p_decision: decision, p_note: note ?? null });

export const bulkAssignRegistrations = (ids: string[], assignedTo: string | null) =>
  rpc<{ affected: number }>("bulk_assign_registrations", { p_registration_ids: ids, p_assigned_to: assignedTo });

// ---------- Activities ----------
export interface CrmActivity {
  id: string; project_id: string | null; lead_id: string | null; registration_id: string | null;
  activity_type: string; title: string; content: string | null;
  metadata: Record<string, unknown>; occurred_at: string; created_by: string | null; created_at: string;
}
export const createCrmActivity = (args: { leadId?: string | null; registrationId?: string | null; activityType: string; title: string; content?: string | null; metadata?: Record<string, unknown>; occurredAt?: string | null }) =>
  rpc<CrmActivity>("create_crm_activity", {
    p_lead_id: args.leadId ?? null, p_registration_id: args.registrationId ?? null,
    p_activity_type: args.activityType, p_title: args.title,
    p_content: args.content ?? null, p_metadata: args.metadata ?? {}, p_occurred_at: args.occurredAt ?? null,
  });

export const getLeadTimeline = (leadId: string, limit = 50, offset = 0) =>
  rpc<CrmActivity[]>("get_lead_timeline", { p_lead_id: leadId, p_limit: limit, p_offset: offset });

export const getRegistrationTimeline = (registrationId: string, limit = 50, offset = 0) =>
  rpc<CrmActivity[]>("get_registration_timeline", { p_registration_id: registrationId, p_limit: limit, p_offset: offset });

// ---------- Tasks ----------
export interface CrmTaskRow {
  id: string; title: string; status: string; priority: string; due_at: string | null;
  assigned_to: string | null; created_by: string | null;
  lead_id: string | null; registration_id: string | null; project_id: string | null;
  created_at: string; updated_at: string;
}
export interface TaskSearchArgs {
  projectId?: string | null; query?: string | null; status?: string | null; priority?: string | null;
  assignedTo?: string | null; overdue?: boolean | null; dueToday?: boolean | null;
  limit?: number; offset?: number;
}
export const searchCrmTasks = (a: TaskSearchArgs = {}) => rpc<CrmTaskRow[]>("search_crm_tasks", {
  p_project_id: a.projectId ?? null, p_query: a.query ?? null, p_status: a.status ?? null,
  p_priority: a.priority ?? null, p_assigned_to: a.assignedTo ?? null,
  p_overdue: a.overdue ?? null, p_due_today: a.dueToday ?? null,
  p_limit: a.limit ?? 50, p_offset: a.offset ?? 0,
});

export const createCrmTask = (args: { leadId?: string | null; registrationId?: string | null; title: string; description?: string | null; priority?: string; dueAt?: string | null; assignedTo?: string | null }) =>
  rpc<CrmTaskRow>("create_crm_task", {
    p_lead_id: args.leadId ?? null, p_registration_id: args.registrationId ?? null,
    p_title: args.title, p_description: args.description ?? null,
    p_priority: args.priority ?? "normal", p_due_at: args.dueAt ?? null,
    p_assigned_to: args.assignedTo ?? null,
  });

export const updateCrmTask = (id: string, patch: Partial<{ title: string; description: string; priority: string; due_at: string | null }>) =>
  rpc<CrmTaskRow>("update_crm_task", {
    p_task_id: id, p_title: patch.title ?? null, p_description: patch.description ?? null,
    p_priority: patch.priority ?? null, p_due_at: patch.due_at ?? null,
  });

export const assignCrmTask = (id: string, assignedTo: string | null) =>
  rpc<CrmTaskRow>("assign_crm_task", { p_task_id: id, p_assigned_to: assignedTo });

export const startCrmTask = (id: string) => rpc<CrmTaskRow>("start_crm_task", { p_task_id: id });
export const completeCrmTask = (id: string) => rpc<CrmTaskRow>("complete_crm_task", { p_task_id: id });
export const cancelCrmTask = (id: string, reason?: string | null) =>
  rpc<CrmTaskRow>("cancel_crm_task", { p_task_id: id, p_reason: reason ?? null });

// ---------- Project members (for assignee pickers) ----------
export async function listAssignableUsers(projectId: string | null): Promise<Array<{ id: string; full_name: string | null; email: string | null }>> {
  // Global roles can be assigned regardless of project; project members are project-scoped.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, status")
    .eq("status", "active")
    .limit(200);
  if (error) throw new ServiceError(error.message, error);
  void projectId; // server enforces project eligibility on assign
  return (data ?? []).map((r) => ({ id: r.id as string, full_name: (r.full_name as string) ?? null, email: null }));
}