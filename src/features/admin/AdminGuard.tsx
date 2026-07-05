import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthLoadingScreen } from "@/features/auth/components/AuthLoadingScreen";
import { canAccessAdminPortal } from "./access";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isInitializing, isLoadingUserContext, currentUser } = useAuth();
  if (isInitializing || (isLoadingUserContext && !currentUser)) return <AuthLoadingScreen />;
  if (!canAccessAdminPortal(currentUser)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}