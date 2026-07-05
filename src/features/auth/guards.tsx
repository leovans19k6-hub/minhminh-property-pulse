import { Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { AuthLoadingScreen } from "./components/AuthLoadingScreen";
import { DisabledAccountScreen } from "./components/DisabledAccountScreen";
import { CurrentUserErrorState } from "./components/CurrentUserErrorState";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasProjectRole,
} from "./permissions";

export function sanitizeReturnUrl(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isInitializing, isAuthenticated, currentUser, isLoadingUserContext, authError } =
    useAuth();
  const location = useLocation();

  if (isInitializing) return <AuthLoadingScreen />;

  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.href);
    return <Navigate to="/login" search={{ returnUrl }} replace />;
  }

  if (isLoadingUserContext && !currentUser) return <AuthLoadingScreen />;

  if (authError && !currentUser) return <CurrentUserErrorState error={authError} />;

  if (currentUser && !currentUser.isActive) return <DisabledAccountScreen />;

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { isInitializing, isAuthenticated } = useAuth();
  if (isInitializing) return <AuthLoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  anyPermissions?: string[];
  allPermissions?: string[];
  projectId?: string;
  projectRoles?: string[];
  fallback?: ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  anyPermissions,
  allPermissions,
  projectId,
  projectRoles,
  fallback = null,
}: PermissionGuardProps) {
  const { currentUser } = useAuth();

  let ok = true;
  if (permission) ok = ok && hasPermission(currentUser, permission);
  if (anyPermissions?.length) ok = ok && hasAnyPermission(currentUser, anyPermissions);
  if (allPermissions?.length) ok = ok && hasAllPermissions(currentUser, allPermissions);
  if (projectId && projectRoles?.length)
    ok = ok && hasProjectRole(currentUser, projectId, projectRoles);

  return <>{ok ? children : fallback}</>;
}