import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { queryClient } from "@/lib/query-client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  role: "indicador" | "admin" | null;
  isAdmin: boolean;
  /** Sessão inicial lida e papel resolvido (ou usuário ausente). */
  authReady: boolean;
  /** @deprecated use authReady — mantido para compatibilidade (equivale a !authReady) */
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"indicador" | "admin" | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const roleFetchSeqRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);
  const roleCacheRef = useRef<Map<string, "indicador" | "admin">>(new Map());
  const inactivityTimerRef = useRef<number | null>(null);
  const inactivityWarningTimerRef = useRef<number | null>(null);
  const authWatchdogTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000;

    const clearAuthWatchdog = () => {
      if (authWatchdogTimerRef.current) {
        window.clearTimeout(authWatchdogTimerRef.current);
        authWatchdogTimerRef.current = null;
      }
    };

    const scheduleAuthWatchdog = () => {
      clearAuthWatchdog();
      authWatchdogTimerRef.current = window.setTimeout(() => {
        if (!isMounted) return;
        toast.error("Sessão instável. Redirecionando para novo login.");
        roleCacheRef.current.clear();
        setSession(null);
        setUser(null);
        setRole(null);
        setAuthReady(true);
        queryClient.clear();
        void supabase.auth.signOut({ scope: "local" });
      }, AUTH_BOOTSTRAP_TIMEOUT_MS);
    };

    const resolveRole = async (authUserId: string | null) => {
      const seq = ++roleFetchSeqRef.current;

      if (!authUserId) {
        if (!isMounted || seq !== roleFetchSeqRef.current) return;
        setRole(null);
        return;
      }

      const cachedRole = roleCacheRef.current.get(authUserId);
      if (cachedRole) {
        if (!isMounted || seq !== roleFetchSeqRef.current) return;
        setRole(cachedRole);
        return;
      }

      const { data, error } = await supabase.rpc("is_admin");
      if (!isMounted || seq !== roleFetchSeqRef.current) return;

      if (error) {
        setRole("indicador");
        return;
      }

      const resolvedRole = data === true ? "admin" : "indicador";
      roleCacheRef.current.set(authUserId, resolvedRole);
      setRole(resolvedRole);
    };

    const finishBootstrap = () => {
      clearAuthWatchdog();
      if (isMounted) setAuthReady(true);
    };

    const bootstrap = async () => {
      setAuthReady(false);
      scheduleAuthWatchdog();
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      const uid = initialSession?.user?.id ?? null;
      lastUserIdRef.current = uid;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (!uid) {
        setRole(null);
        finishBootstrap();
        return;
      }

      setRole(null);
      await resolveRole(uid);
      finishBootstrap();
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextId = nextSession?.user?.id ?? null;
      const prevId = lastUserIdRef.current;

      if (nextId !== prevId) {
        lastUserIdRef.current = nextId;
        setAuthReady(false);
        setRole(null);
        scheduleAuthWatchdog();
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextId) {
        clearAuthWatchdog();
        setRole(null);
        roleCacheRef.current.clear();
        setAuthReady(true);
        queryClient.clear();
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
        void queryClient.invalidateQueries({ queryKey: ["usuario"] });
        return;
      }

      if (nextId === prevId) {
        const cachedRole = roleCacheRef.current.get(nextId);
        if (cachedRole) {
          clearAuthWatchdog();
          setRole(cachedRole);
          setAuthReady(true);
          return;
        }
      }

      await resolveRole(nextId);
      clearAuthWatchdog();
      setAuthReady(true);

      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      void queryClient.invalidateQueries({ queryKey: ["usuario"] });
      void queryClient.invalidateQueries({ queryKey: ["indicacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["comissoes"] });
    });

    return () => {
      isMounted = false;
      clearAuthWatchdog();
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const INACTIVITY_MS = 30 * 60 * 1000;

    if (!authReady || !session?.user) {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (inactivityWarningTimerRef.current) {
        window.clearTimeout(inactivityWarningTimerRef.current);
        inactivityWarningTimerRef.current = null;
      }
      toast.dismiss("session-expiring-warning");
      return;
    }

    const performInactivityLogout = () => {
      toast.dismiss("session-expiring-warning");
      void supabase.auth.signOut({ scope: "local" });
    };

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
      if (inactivityWarningTimerRef.current) {
        window.clearTimeout(inactivityWarningTimerRef.current);
      }
      toast.dismiss("session-expiring-warning");
      inactivityWarningTimerRef.current = window.setTimeout(() => {
        toast.warning("Sua sessão expira em 1 minuto por inatividade.", {
          id: "session-expiring-warning",
        });
      }, INACTIVITY_MS - 60 * 1000);
      inactivityTimerRef.current = window.setTimeout(performInactivityLogout, INACTIVITY_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true });
    }
    resetInactivityTimer();

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetInactivityTimer);
      }
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (inactivityWarningTimerRef.current) {
        window.clearTimeout(inactivityWarningTimerRef.current);
        inactivityWarningTimerRef.current = null;
      }
      toast.dismiss("session-expiring-warning");
    };
  }, [authReady, session?.user?.id]);

  useEffect(() => {
    const refreshCache = () => {
      void queryClient.invalidateQueries();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshCache();
      }
    };
    window.addEventListener("focus", refreshCache);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshCache);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      isAdmin: role === "admin",
      authReady,
      isLoading: !authReady,
    }),
    [session, user, role, authReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }
  return context;
}
