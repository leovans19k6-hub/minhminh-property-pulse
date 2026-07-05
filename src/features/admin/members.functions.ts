import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Search active users eligible to be added as project members.
 * Caller must be a project manager for the given project (super_admin,
 * admin, director, or project_director/admin member of the project).
 */
export const searchEligibleProjectMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        projectId: z.string().uuid(),
        query: z.string().trim().max(200).optional().default(""),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Authorize: caller must be project manager.
    const { data: canManage, error: authErr } = await context.supabase.rpc(
      "is_project_manager",
      { p_project_id: data.projectId },
    );
    if (authErr) throw new Error(authErr.message);
    if (!canManage) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, phone, employee_code, branch, department, position, status")
      .eq("status", "active")
      .limit(data.limit);
    if (data.query) {
      const s = data.query;
      q = q.or(`full_name.ilike.%${s}%,employee_code.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });