import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { unwrap, ServiceError } from "../_helpers";

export type MemberRow = Database["public"]["Tables"]["project_members"]["Row"];
export type MemberInsert = Database["public"]["Tables"]["project_members"]["Insert"];
export type MemberUpdate = Database["public"]["Tables"]["project_members"]["Update"];

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  project_director: "Giám đốc dự án",
  sales_manager: "Trưởng phòng KD",
  sales: "Chuyên viên KD",
  marketing: "Marketing",
  marketing_lead: "Trưởng nhóm MKT",
  admin: "Admin dự án",
  support: "Hỗ trợ",
};

export async function listProjectMembers(projectId: string) {
  return unwrap(
    await supabase
      .from("project_members")
      .select("*, profiles(id, full_name, avatar_url, phone, employee_code, branch, department, position, status)")
      .eq("project_id", projectId)
      .order("is_primary_contact", { ascending: false })
      .order("created_at", { ascending: true }),
    "members.list",
  );
}

export async function addProjectMember(input: MemberInsert): Promise<MemberRow> {
  // Always insert with is_primary_contact=false; use RPC to set primary safely.
  return unwrap(
    await supabase
      .from("project_members")
      .insert({ ...input, is_primary_contact: false })
      .select("*")
      .single(),
    "members.add",
  );
}

export async function updateProjectMember(id: string, patch: MemberUpdate): Promise<MemberRow> {
  // Prevent direct primary contact toggles here.
  const { is_primary_contact: _ignore, ...safe } = patch;
  void _ignore;
  return unwrap(
    await supabase.from("project_members").update(safe).eq("id", id).select("*").single(),
    "members.update",
  );
}

export async function removeProjectMember(id: string) {
  const res = await supabase.from("project_members").delete().eq("id", id);
  if (res.error) throw new ServiceError(res.error.message, res.error);
}

export async function setPrimaryContact(projectId: string, memberId: string) {
  const { error } = await supabase.rpc("set_project_primary_contact", {
    p_project_id: projectId,
    p_project_member_id: memberId,
  });
  if (error) {
    if (error.message.includes("insufficient_privilege")) throw new ServiceError("Bạn không có quyền đổi người liên hệ chính.");
    if (error.message.includes("member_not_in_project")) throw new ServiceError("Thành viên không thuộc dự án.");
    throw new ServiceError(error.message, error);
  }
}