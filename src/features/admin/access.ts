import type { CurrentUserContext } from "@/features/auth/types";

/**
 * Client-side gate for accessing /admin. Server-side RLS / server-fn checks
 * remain the source of truth.
 */
export function canAccessAdminPortal(ctx: CurrentUserContext | null): boolean {
  if (!ctx || !ctx.isActive) return false;
  if (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector) return true;
  const eligible = new Set(["project_director", "sales_manager", "marketing"]);
  return ctx.systemRoles.some((r) => eligible.has(r));
}

export function canManageUsers(ctx: CurrentUserContext | null): boolean {
  return Boolean(ctx?.isActive && (ctx.isSuperAdmin || ctx.isAdmin));
}

export function canReadUsers(ctx: CurrentUserContext | null): boolean {
  return Boolean(ctx?.isActive && (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector));
}

export function canManageDevelopers(ctx: CurrentUserContext | null): boolean {
  return Boolean(ctx?.isActive && (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector));
}

export function canCreateProjects(ctx: CurrentUserContext | null): boolean {
  return Boolean(ctx?.isActive && (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector));
}

export function canManageProject(
  ctx: CurrentUserContext | null,
  projectId: string,
): boolean {
  if (!ctx?.isActive) return false;
  if (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector) return true;
  return ctx.projectMemberships.some(
    (m) =>
      m.projectId === projectId &&
      ["project_director", "admin"].includes(m.memberRole),
  );
}

/**
 * Roles a given actor is permitted to assign/remove.
 */
export function assignableRoles(ctx: CurrentUserContext | null): string[] {
  if (!ctx?.isActive) return [];
  if (ctx.isSuperAdmin) {
    return [
      "super_admin",
      "admin",
      "director",
      "project_director",
      "sales_manager",
      "sales",
      "marketing",
      "staff",
    ];
  }
  if (ctx.isAdmin) {
    return ["director", "project_director", "sales_manager", "sales", "marketing", "staff"];
  }
  return [];
}