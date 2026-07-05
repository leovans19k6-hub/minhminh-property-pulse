import type { CurrentUserContext } from "./types";

// Permission constants
export const P = {
  projects_read: "projects.read",
  projects_create: "projects.create",
  projects_update: "projects.update",
  projects_archive: "projects.archive",

  inventory_read: "inventory.read",
  inventory_create: "inventory.create",
  inventory_update: "inventory.update",
  inventory_status_update: "inventory.status.update",

  pricing_read: "pricing.read",
  pricing_update: "pricing.update",

  policies_read: "policies.read",
  policies_manage: "policies.manage",

  vouchers_read: "vouchers.read",
  vouchers_manage: "vouchers.manage",

  events_read: "events.read",
  events_manage: "events.manage",

  leads_read: "leads.read",
  leads_create: "leads.create",
  leads_update: "leads.update",
  leads_assign: "leads.assign",

  registrations_read: "registrations.read",
  registrations_create: "registrations.create",
  registrations_update: "registrations.update",

  imports_read: "imports.read",
  imports_create: "imports.create",

  users_read: "users.read",
  users_manage_roles: "users.manage_roles",

  audit_read: "audit.read",
  notifications_read: "notifications.read",
} as const;

export type Permission = (typeof P)[keyof typeof P];

const ALL_PERMISSIONS: Permission[] = Object.values(P);

const READ_ONLY: Permission[] = [
  P.projects_read,
  P.inventory_read,
  P.pricing_read,
  P.policies_read,
  P.vouchers_read,
  P.events_read,
  P.notifications_read,
];

const SALES_BASE: Permission[] = [
  ...READ_ONLY,
  P.leads_create,
  P.leads_read,
  P.leads_update,
  P.registrations_read,
  P.registrations_create,
  P.registrations_update,
];

const MARKETING_BASE: Permission[] = [
  ...READ_ONLY,
  P.policies_manage,
  P.vouchers_manage,
  P.events_manage,
  P.leads_read,
];

const MANAGER_BASE: Permission[] = [
  ...SALES_BASE,
  P.inventory_create,
  P.inventory_update,
  P.inventory_status_update,
  P.leads_assign,
  P.imports_read,
  P.imports_create,
];

/**
 * Compute effective permissions from system roles.
 * Project-scoped permissions still need DB RLS as final boundary — this map is UX-only.
 */
export function computePermissions(systemRoles: string[]): Set<string> {
  const perms = new Set<string>();

  if (systemRoles.includes("super_admin")) {
    ALL_PERMISSIONS.forEach((p) => perms.add(p));
    return perms;
  }
  if (systemRoles.includes("admin")) {
    ALL_PERMISSIONS.forEach((p) => perms.add(p));
    return perms;
  }
  if (systemRoles.includes("director")) {
    READ_ONLY.forEach((p) => perms.add(p));
    MANAGER_BASE.forEach((p) => perms.add(p));
    perms.add(P.audit_read);
    perms.add(P.users_read);
    return perms;
  }
  if (systemRoles.includes("project_director")) {
    MANAGER_BASE.forEach((p) => perms.add(p));
    perms.add(P.policies_manage);
    perms.add(P.vouchers_manage);
    perms.add(P.events_manage);
  }
  if (systemRoles.includes("sales_manager")) {
    MANAGER_BASE.forEach((p) => perms.add(p));
  }
  if (systemRoles.includes("sales")) {
    SALES_BASE.forEach((p) => perms.add(p));
  }
  if (systemRoles.includes("marketing")) {
    MARKETING_BASE.forEach((p) => perms.add(p));
  }
  if (systemRoles.includes("staff")) {
    READ_ONLY.forEach((p) => perms.add(p));
  }

  return perms;
}

export function hasPermission(ctx: CurrentUserContext | null, permission: string): boolean {
  if (!ctx) return false;
  return ctx.permissions.has(permission);
}

export function hasAnyPermission(
  ctx: CurrentUserContext | null,
  permissions: string[],
): boolean {
  if (!ctx) return false;
  return permissions.some((p) => ctx.permissions.has(p));
}

export function hasAllPermissions(
  ctx: CurrentUserContext | null,
  permissions: string[],
): boolean {
  if (!ctx) return false;
  return permissions.every((p) => ctx.permissions.has(p));
}

export function hasProjectRole(
  ctx: CurrentUserContext | null,
  projectId: string,
  roles: string[],
): boolean {
  if (!ctx) return false;
  if (ctx.isSuperAdmin || ctx.isAdmin || ctx.isDirector) return true;
  return ctx.projectMemberships.some(
    (m) => m.projectId === projectId && roles.includes(m.memberRole),
  );
}