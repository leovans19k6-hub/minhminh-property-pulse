import type { Database } from "@/integrations/supabase/types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface ProjectMembership {
  projectId: string;
  memberRole: string;
  isPrimaryContact: boolean;
}

export interface CurrentUserContext {
  userId: string;
  email: string | null;
  profile: ProfileRow | null;
  systemRoles: string[];
  projectMemberships: ProjectMembership[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isDirector: boolean;
  isActive: boolean;
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}