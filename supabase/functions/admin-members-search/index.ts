export const searchEligibleProjectMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(...)
  .handler(async ({ data, context }) => {
    const { data: canManage, error: authErr } = await context.supabase.rpc(
      "is_project_manager",
      { p_project_id: data.projectId },
    );

    if (authErr) throw new Error(authErr.message);
    if (!canManage) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = supabaseAdmin
      .from("profiles")
      .select(...)
      .eq("status", "active")
      .limit(data.limit);

    if (data.query) {
      ...
    }

    const { data: rows, error } = await q;

    if (error) throw new Error(error.message);

    return { rows: rows ?? [] };
  });