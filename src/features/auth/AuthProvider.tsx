import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchCurrentUserContext } from "./auth.service";
import type { CurrentUserContext } from "./types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  currentUser: CurrentUserContext | null;
  isInitializing: boolean;
  isLoadingUserContext: boolean;
  isAuthenticated: boolean;
  authError: Error | null;
  refreshUserContext: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserContext | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingUserContext, setIsLoadingUserContext] = useState(false);
  const [authError, setAuthError] = useState<Error | null>(null);

  const loadUserContext = async (s: Session | null) => {
    if (!s?.user) {
      setCurrentUser(null);
      return;
    }
    setIsLoadingUserContext(true);
    setAuthError(null);
    try {
      const ctx = await fetchCurrentUserContext(s.user.id, s.user.email ?? null);
      setCurrentUser(ctx);
    } catch (err) {
      console.error("[Auth] Failed to load user context", err);
      setAuthError(err as Error);
      setCurrentUser(null);
    } finally {
      setIsLoadingUserContext(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Register listener BEFORE getSession to avoid race conditions.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setAuthError(null);
        // Clear private cached data.
        queryClient.clear();
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // No-op: token refresh should not trigger user context reload.
        return;
      }

      if (
        event === "SIGNED_IN" ||
        event === "USER_UPDATED" ||
        event === "INITIAL_SESSION"
      ) {
        // Defer async work to avoid deadlock inside auth callback.
        queueMicrotask(() => {
          if (mounted) void loadUserContext(newSession);
        });
      }
    });

    // Initial session resolve.
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadUserContext(data.session).finally(() => {
          if (mounted) setIsInitializing(false);
        });
      } else {
        setIsInitializing(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      currentUser,
      isInitializing,
      isLoadingUserContext,
      isAuthenticated: Boolean(session?.user),
      authError,
      refreshUserContext: async () => {
        await loadUserContext(session);
      },
      signOut: async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, currentUser, isInitializing, isLoadingUserContext, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useCurrentUser(): CurrentUserContext | null {
  return useAuth().currentUser;
}