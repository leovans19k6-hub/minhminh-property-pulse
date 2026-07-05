import { supabase } from "@/integrations/supabase/client";
import { AuthError, type CurrentUserContext } from "./types";
import { computePermissions } from "./permissions";

function mapSupabaseError(err: { message?: string } | null | undefined): AuthError {
  const msg = err?.message ?? "";
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return new AuthError("invalid_credentials", "Email hoặc mật khẩu không đúng.");
  }
  if (lower.includes("email not confirmed")) {
    return new AuthError("email_not_confirmed", "Email chưa được xác nhận.");
  }
  if (lower.includes("user banned") || lower.includes("disabled")) {
    return new AuthError("account_disabled", "Tài khoản không thể đăng nhập.");
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return new AuthError(
      "rate_limited",
      "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.",
    );
  }
  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return new AuthError(
      "network",
      "Không thể kết nối máy chủ. Vui lòng thử lại.",
    );
  }
  return new AuthError("unknown", msg || "Đã xảy ra lỗi. Vui lòng thử lại.");
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw mapSupabaseError(error);
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw mapSupabaseError(error);
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw mapSupabaseError(error);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw mapSupabaseError(error);
}

export async function updateProfile(
  userId: string,
  patch: { full_name?: string | null; phone?: string | null; avatar_url?: string | null },
) {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) throw new AuthError("profile_update_failed", error.message);
}

/**
 * Fetches profile, system roles, and project memberships for the current user.
 * Returns a CurrentUserContext with computed permissions.
 */
export async function fetchCurrentUserContext(
  userId: string,
  email: string | null,
): Promise<CurrentUserContext> {
  // Step 1: fetch profile alone. Inactive users may not read business tables,
  // so we short-circuit before touching roles / project_members.
  const profileRes = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (profileRes.error) throw new AuthError("profile_load_failed", profileRes.error.message);
  const profile = profileRes.data ?? null;
  const status = (profile?.status as string | undefined) ?? "active";
  const isActive = status === "active";

  if (!isActive) {
    return {
      userId, email, profile,
      systemRoles: [], projectMemberships: [],
      permissions: computePermissions([]),
      isSuperAdmin: false, isAdmin: false, isDirector: false, isActive: false,
    };
  }

  const [rolesRes, membershipsRes] = await Promise.all([
    supabase.from("user_roles").select("roles(code)").eq("user_id", userId),
    supabase
      .from("project_members")
      .select("project_id, member_role, is_primary_contact")
      .eq("user_id", userId),
  ]);

  const systemRoles: string[] = (rolesRes.data ?? [])
    .map((r: { roles: { code: string } | null }) => r.roles?.code)
    .filter((c): c is string => Boolean(c));

  const projectMemberships = (membershipsRes.data ?? []).map((m) => ({
    projectId: m.project_id,
    memberRole: m.member_role,
    isPrimaryContact: Boolean(m.is_primary_contact),
  }));

  return {
    userId,
    email,
    profile,
    systemRoles,
    projectMemberships,
    permissions: computePermissions(systemRoles),
    isSuperAdmin: systemRoles.includes("super_admin"),
    isAdmin: systemRoles.includes("admin"),
    isDirector: systemRoles.includes("director"),
    isActive: true,
  };
}