import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ServiceError,
  ensureSuccess,
  unwrap,
  unwrapMaybe,
} from "@/services/_helpers";

/**
 * Users administration server functions.
 * All privileged operations verify caller identity + role at runtime.
 * Uses supabaseAdmin lazily inside handlers (never module scope).
 */

const PRIVILEGED_ROLE_CODES = ["super_admin", "admin"] as const;
const READ_ROLE_CODES = ["super_admin", "admin", "director"] as const;

async function assertCallerRole(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  roles: readonly string[],
) {
  // Verify caller is active + has one of the given system roles via server RLS
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) throw new ServiceError("forbidden");
  if ((profile.status ?? "active") !== "active") throw new Error("forbidden_inactive");

  const { data: userRoles, error: roleErr } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("user_id", userId);
  if (roleErr) throw new ServiceError("forbidden");
  const codes = (userRoles ?? []).flatMap((r) => {
    const rel = (r as { roles: { code: string } | { code: string }[] | null }).roles;
    if (!rel) return [];
    return Array.isArray(rel) ? rel.map((x) => x.code) : [rel.code];
  });
  const ok = codes.some((c) => (roles as readonly string[]).includes(c));
  if (!ok) throw new ServiceError("forbidden");
  return codes;
}

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().trim().max(200).optional(),
        status: z.enum(["active", "inactive", "all"]).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertCallerRole(context.supabase, context.userId, READ_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select("*, user_roles(role_id, roles(code, name))", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search;
      q = q.or(
        `full_name.ilike.%${s}%,employee_code.ilike.%${s}%,phone.ilike.%${s}%`,
      );
    }

    const { data: rows, error, count } = await q;
    ensureSuccess(error, "admin.users.<operation>");

    // Enrich with email from auth admin
    const ids = (rows ?? []).map((r) => r.id);
    const emailMap = new Map<string, string | null>();
    if (ids.length) {
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      authList?.users?.forEach((u) => emailMap.set(u.id, u.email ?? null));
    }

    return {
      rows: (rows ?? []).map((r) => ({
        id: r.id,
        email: emailMap.get(r.id) ?? null,
        full_name: r.full_name,
        phone: r.phone,
        employee_code: r.employee_code,
        branch: r.branch,
        department: r.department,
        position: r.position,
        status: r.status,
        avatar_url: r.avatar_url,
        created_at: r.created_at,
        roles: ((r as { user_roles?: Array<{ roles: unknown }> }).user_roles ?? []).flatMap((ur) => {
          const rel = ur.roles as { code: string; name: string } | { code: string; name: string }[] | null;
          if (!rel) return [];
          return Array.isArray(rel) ? rel : [rel];
        }),
      })),
      total: count ?? 0,
    };
  });

export const getAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertCallerRole(context.supabase, context.userId, READ_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("*, user_roles(role_id, roles(id, code, name)), project_members(id, member_role, is_primary_contact, projects(id, name, code))")
      .eq("id", data.userId)
      .maybeSingle();
    ensureSuccess(error, "admin.users.<operation>");
    if (!profile) throw new Error("user_not_found");

    const { data: auth } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    return {
      profile,
      email: auth?.user?.email ?? null,
      auth_created_at: auth?.user?.created_at ?? null,
      last_sign_in_at: auth?.user?.last_sign_in_at ?? null,
    };
  });

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(10).max(128),
  full_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional(),
  employee_code: z.string().trim().max(50).optional(),
  branch: z.string().trim().max(100).optional(),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertCallerRole(context.supabase, context.userId, PRIVILEGED_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "create_failed");

    const uid = created.user.id;
    // handle_new_user trigger creates the profile; upsert to fill remaining fields.
    await supabaseAdmin.from("profiles").upsert({
      id: uid,
      full_name: data.full_name,
      phone: data.phone ?? null,
      employee_code: data.employee_code ?? null,
      branch: data.branch ?? null,
      department: data.department ?? null,
      position: data.position ?? null,
      status: data.status,
    });

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "admin_create_user",
      entity_type: "profiles",
      entity_id: uid,
      metadata: { email: data.email },
    });
    return { id: uid };
  });

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  full_name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  employee_code: z.string().trim().max(50).nullable().optional(),
  branch: z.string().trim().max(100).nullable().optional(),
  department: z.string().trim().max(100).nullable().optional(),
  position: z.string().trim().max(100).nullable().optional(),
});

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertCallerRole(context.supabase, context.userId, PRIVILEGED_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, ...patch } = data;
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
    ensureSuccess(error, "admin.users.<operation>");
    return { ok: true };
  });

async function countSuperAdmins(
  supabaseAdmin: ReturnType<typeof import("@supabase/supabase-js").createClient>,
): Promise<number> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, roles!inner(code), profiles!inner(status)")
    .eq("roles.code", "super_admin")
    .eq("profiles.status", "active");
  return (data ?? []).length;
}

async function isSuperAdmin(
  supabaseAdmin: ReturnType<typeof import("@supabase/supabase-js").createClient>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("roles!inner(code)")
    .eq("user_id", userId)
    .eq("roles.code", "super_admin");
  return (data ?? []).length > 0;
}

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
      status: z.enum(["active", "inactive"]),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const callerCodes = await assertCallerRole(context.supabase, context.userId, PRIVILEGED_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const targetIsSuper = await isSuperAdmin(
      supabaseAdmin as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>,
      data.userId,
    );

    if (targetIsSuper) {
      if (!callerCodes.includes("super_admin")) throw new Error("cannot_manage_super_admin");
      if (data.status === "inactive") {
        const superCount = await countSuperAdmins(
          supabaseAdmin as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>,
        );
        if (superCount <= 1) throw new Error("cannot_disable_last_super_admin");
      }
    }

    if (data.status === "inactive" && data.userId === context.userId) {
      // Prevent self-disable if that would leave zero super admins
      if (callerCodes.includes("super_admin")) {
        const superCount = await countSuperAdmins(
          supabaseAdmin as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>,
        );
        if (superCount <= 1) throw new Error("cannot_disable_last_super_admin");
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    ensureSuccess(error, "admin.users.<operation>");

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: data.status === "active" ? "admin_enable_user" : "admin_disable_user",
      entity_type: "profiles",
      entity_id: data.userId,
    });
    return { ok: true };
  });

export const assignUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
      roleCode: z.string().min(1).max(64),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const callerCodes = await assertCallerRole(context.supabase, context.userId, PRIVILEGED_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (["super_admin", "admin"].includes(data.roleCode) && !callerCodes.includes("super_admin")) {
      throw new Error("insufficient_privilege");
    }
    if (data.roleCode === "super_admin" && !callerCodes.includes("super_admin")) {
      throw new Error("insufficient_privilege");
    }

    const { data: role } = await supabaseAdmin
      .from("roles").select("id").eq("code", data.roleCode).maybeSingle();
    if (!role) throw new Error("role_not_found");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role_id: role.id }, { onConflict: "user_id,role_id" });
    ensureSuccess(error, "admin.users.<operation>");
    return { ok: true };
  });

export const removeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      userId: z.string().uuid(),
      roleCode: z.string().min(1).max(64),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const callerCodes = await assertCallerRole(context.supabase, context.userId, PRIVILEGED_ROLE_CODES);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (["super_admin", "admin"].includes(data.roleCode) && !callerCodes.includes("super_admin")) {
      throw new Error("insufficient_privilege");
    }

    if (data.roleCode === "super_admin") {
      const superCount = await countSuperAdmins(
        supabaseAdmin as unknown as ReturnType<typeof import("@supabase/supabase-js").createClient>,
      );
      if (superCount <= 1) throw new Error("cannot_remove_last_super_admin");
    }

    const { data: role } = await supabaseAdmin
      .from("roles").select("id").eq("code", data.roleCode).maybeSingle();
    if (!role) throw new Error("role_not_found");

    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId).eq("role_id", role.id);
    ensureSuccess(error, "admin.users.<operation>");
    return { ok: true };
  });